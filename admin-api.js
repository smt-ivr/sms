export default async function handleAdminApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    let storedAdminPass = null; 
    try {
        const record = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password'").first();
        if (record && record.value) storedAdminPass = record.value;
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }

    const adminPass = request.headers.get('x-admin-password');
    const isAdmin = storedAdminPass && adminPass === storedAdminPass;

    const userCodeHeader = request.headers.get('x-user-code');
    let currentUser = null;
    if (userCodeHeader) {
        currentUser = await env.DB.prepare('SELECT * FROM access_codes WHERE code = ?').bind(userCodeHeader).first();
    }
    const isUser = currentUser && currentUser.is_blocked !== 1;

    if (path.includes('/api/admin') && !isAdmin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    if (path.includes('/api/user') && !isUser) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    try {
        const method = request.method;

        if (path.includes('/api/admin')) {
            if (method === 'GET' && path.endsWith('/codes')) {
                const { results } = await env.DB.prepare(`
                    SELECT a.*, COUNT(s.id) as current_systems 
                    FROM access_codes a LEFT JOIN system_tokens s ON a.id = s.code_id 
                    GROUP BY a.id ORDER BY a.id DESC`).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'GET' && path.includes('/systems/')) {
                const codeId = path.split('/').pop();
                const { results } = await env.DB.prepare('SELECT * FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(codeId).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'GET' && path.endsWith('/logs')) {
                const { results } = await env.DB.prepare(`
                    SELECT l.*, c.owner_name, s.description FROM access_logs l
                    LEFT JOIN access_codes c ON l.code_id = c.id
                    LEFT JOIN system_tokens s ON l.system_id = s.id
                    ORDER BY l.timestamp DESC LIMIT 200
                `).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'POST') {
                const body = await request.json();
                if (path.endsWith('/settings/password')) {
                    await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").bind(body.newPassword).run();
                    return new Response(JSON.stringify({ success: true }));
                }
                if (path.endsWith('/codes')) {
                    await env.DB.prepare('INSERT INTO access_codes (code, owner_name, max_systems, is_blocked, allow_temp_codes) VALUES (?, ?, ?, ?, ?)')
                        .bind(body.code, body.owner_name, body.max_systems || 5, body.is_blocked || 0, body.allow_temp_codes || 0).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
            if (method === 'PUT' && path.includes('/codes/')) {
                const id = path.split('/').pop();
                const body = await request.json();
                await env.DB.prepare('UPDATE access_codes SET code=?, owner_name=?, max_systems=?, is_blocked=?, allow_temp_codes=? WHERE id=?')
                    .bind(body.code, body.owner_name, body.max_systems, body.is_blocked, body.allow_temp_codes, id).run();
                return new Response(JSON.stringify({ success: true }));
            }
            if (method === 'DELETE' && path.includes('/codes/')) {
                const id = path.split('/').pop();
                await env.DB.prepare('DELETE FROM temp_codes WHERE code_id = ?').bind(id).run();
                await env.DB.prepare('DELETE FROM system_tokens WHERE code_id = ?').bind(id).run();
                await env.DB.prepare('DELETE FROM access_codes WHERE id = ?').bind(id).run();
                return new Response(JSON.stringify({ success: true }));
            }
        }

        if (path.includes('/api/user')) {
            if (method === 'GET' && path.endsWith('/data')) {
                const systems = await env.DB.prepare('SELECT id, description, token FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(currentUser.id).all();
                return new Response(JSON.stringify({ user: currentUser, systems: systems.results }), { headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'GET' && path.endsWith('/logs')) {
                const { results } = await env.DB.prepare(`
                    SELECT l.timestamp, s.description, l.ip_address 
                    FROM access_logs l LEFT JOIN system_tokens s ON l.system_id = s.id
                    WHERE l.code_id = ? ORDER BY l.timestamp DESC LIMIT 50
                `).bind(currentUser.id).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'POST' && path.endsWith('/systems')) {
                const body = await request.json();
                const countReq = await env.DB.prepare('SELECT COUNT(*) as count FROM system_tokens WHERE code_id = ?').bind(currentUser.id).first();
                if (countReq.count >= currentUser.max_systems) return new Response(JSON.stringify({ error: `הגעת למגבלת המערכות שלך` }), { status: 400 });
                await env.DB.prepare('INSERT INTO system_tokens (code_id, description, token) VALUES (?, ?, ?)')
                    .bind(currentUser.id, body.description, body.token).run();
                return new Response(JSON.stringify({ success: true }));
            }
            if (method === 'PUT' && path.includes('/systems/')) {
                const id = path.split('/').pop();
                const body = await request.json();
                await env.DB.prepare('UPDATE system_tokens SET description=?, token=? WHERE id=? AND code_id=?')
                    .bind(body.description, body.token, id, currentUser.id).run();
                return new Response(JSON.stringify({ success: true }));
            }
            if (method === 'DELETE' && path.includes('/systems/')) {
                const id = path.split('/').pop();
                await env.DB.prepare('DELETE FROM temp_codes WHERE system_id = ? AND code_id = ?').bind(id, currentUser.id).run();
                await env.DB.prepare('DELETE FROM system_tokens WHERE id=? AND code_id=?').bind(id, currentUser.id).run();
                return new Response(JSON.stringify({ success: true }));
            }

            // --- ניהול קודים זמניים (Temp Codes) ---
            if (path.endsWith('/temp_codes/logs')) {
                if (!currentUser.allow_temp_codes) return new Response(JSON.stringify({error: 'אין הרשאה'}), {status: 403});
                const { results } = await env.DB.prepare(`
                    SELECT l.*, t.temp_code, s.description 
                    FROM temp_access_logs l
                    JOIN temp_codes t ON l.temp_code_id = t.id
                    JOIN system_tokens s ON t.system_id = s.id
                    WHERE t.code_id = ? ORDER BY l.timestamp DESC LIMIT 50
                `).bind(currentUser.id).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (path.endsWith('/temp_codes')) {
                if (!currentUser.allow_temp_codes) return new Response(JSON.stringify({error: 'אין הרשאה'}), {status: 403});
                if (method === 'GET') {
                    const { results } = await env.DB.prepare(`
                        SELECT t.*, s.description as system_desc, 
                        (SELECT COUNT(*) FROM temp_access_logs WHERE temp_code_id = t.id) as usage_count
                        FROM temp_codes t JOIN system_tokens s ON t.system_id = s.id 
                        WHERE t.code_id = ? ORDER BY t.id DESC
                    `).bind(currentUser.id).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
                if (method === 'POST') {
                    const body = await request.json();
                    const tempCodeStr = Math.random().toString(36).substring(2, 10).toUpperCase();
                    const expiresAt = Date.now() + (body.durationMinutes * 60 * 1000);
                    await env.DB.prepare('INSERT INTO temp_codes (code_id, system_id, temp_code, expires_at) VALUES (?, ?, ?, ?)')
                        .bind(currentUser.id, body.systemId, tempCodeStr, expiresAt).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
            if (path.includes('/temp_codes/')) {
                if (!currentUser.allow_temp_codes) return new Response(JSON.stringify({error: 'אין הרשאה'}), {status: 403});
                const id = path.split('/').pop();
                if (method === 'PUT') {
                    const body = await request.json();
                    if (body.action === 'extend') {
                        const addMs = (body.minutes || 10) * 60 * 1000;
                        await env.DB.prepare('UPDATE temp_codes SET expires_at = MAX(expires_at, ?) + ? WHERE id = ? AND code_id = ?')
                            .bind(Date.now(), addMs, id, currentUser.id).run();
                    } else if (body.action === 'toggle') {
                        await env.DB.prepare('UPDATE temp_codes SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ? AND code_id = ?')
                            .bind(id, currentUser.id).run();
                    }
                    return new Response(JSON.stringify({ success: true }));
                }
                if (method === 'DELETE') {
                    await env.DB.prepare('DELETE FROM temp_access_logs WHERE temp_code_id = ?').bind(id).run();
                    await env.DB.prepare('DELETE FROM temp_codes WHERE id = ? AND code_id = ?').bind(id, currentUser.id).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
        }

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Not Found', { status: 404 });
}
