export default async function handleAdminApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // --- אבטחה: זיהוי מנהל ---
    let storedAdminPass = null; 
    try {
        const record = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password'").first();
        if (record && record.value) storedAdminPass = record.value;
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }

    const adminPass = request.headers.get('x-admin-password');
    const isAdmin = storedAdminPass && adminPass === storedAdminPass;

    // --- אבטחה: זיהוי משתמש ---
    const userCodeHeader = request.headers.get('x-user-code');
    let currentUser = null;
    if (userCodeHeader) {
        currentUser = await env.DB.prepare('SELECT * FROM access_codes WHERE code = ?').bind(userCodeHeader).first();
    }
    const isUser = currentUser && currentUser.is_blocked !== 1;

    // --- חסימת גישה למי שאינו מורשה ---
    if (path.includes('/api/admin') && !isAdmin) return new Response(JSON.stringify({ error: 'Unauthorized Admin' }), { status: 401 });
    if (path.includes('/api/user') && !isUser) return new Response(JSON.stringify({ error: 'Unauthorized User or Blocked' }), { status: 401 });

    try {
        const method = request.method;

        // ==========================================
        //  API עבור מנהל המערכת (Admin)
        // ==========================================
        if (path.includes('/api/admin')) {
            if (method === 'GET') {
                if (path.endsWith('/codes')) {
                    const { results } = await env.DB.prepare(`
                        SELECT a.*, COUNT(s.id) as current_systems 
                        FROM access_codes a LEFT JOIN system_tokens s ON a.id = s.code_id 
                        GROUP BY a.id ORDER BY a.id DESC`).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
                if (path.includes('/systems/')) {
                    const codeId = path.split('/').pop();
                    const { results } = await env.DB.prepare('SELECT * FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(codeId).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
                if (path.endsWith('/logs')) {
                    const { results } = await env.DB.prepare(`
                        SELECT l.*, c.owner_name, s.description FROM access_logs l
                        LEFT JOIN access_codes c ON l.code_id = c.id
                        LEFT JOIN system_tokens s ON l.system_id = s.id
                        ORDER BY l.timestamp DESC LIMIT 200
                    `).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
            }
            if (method === 'POST') {
                const body = await request.json();
                if (path.endsWith('/settings/password')) {
                    await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").bind(body.newPassword).run();
                    return new Response(JSON.stringify({ success: true }));
                }
                if (path.endsWith('/codes')) {
                    await env.DB.prepare('INSERT INTO access_codes (code, owner_name, max_systems, is_blocked) VALUES (?, ?, ?, ?)')
                        .bind(body.code, body.owner_name, body.max_systems || 5, body.is_blocked || 0).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
            if (method === 'PUT') {
                const body = await request.json();
                if (path.includes('/codes/')) {
                    const id = path.split('/').pop();
                    await env.DB.prepare('UPDATE access_codes SET code=?, owner_name=?, max_systems=?, is_blocked=? WHERE id=?')
                        .bind(body.code, body.owner_name, body.max_systems, body.is_blocked, id).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
            if (method === 'DELETE') {
                if (path.includes('/codes/')) {
                    const id = path.split('/').pop();
                    await env.DB.prepare('DELETE FROM system_tokens WHERE code_id = ?').bind(id).run();
                    await env.DB.prepare('DELETE FROM access_codes WHERE id = ?').bind(id).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
        }

        // ==========================================
        //  API עבור משתמשים (User Portal)
        // ==========================================
        if (path.includes('/api/user')) {
            if (method === 'GET') {
                if (path.endsWith('/data')) {
                    const systems = await env.DB.prepare('SELECT id, description, token FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(currentUser.id).all();
                    return new Response(JSON.stringify({ user: currentUser, systems: systems.results }), { headers: { 'Content-Type': 'application/json' } });
                }
                if (path.endsWith('/logs')) {
                    const { results } = await env.DB.prepare(`
                        SELECT l.timestamp, s.description, l.ip_address 
                        FROM access_logs l LEFT JOIN system_tokens s ON l.system_id = s.id
                        WHERE l.code_id = ? ORDER BY l.timestamp DESC LIMIT 50
                    `).bind(currentUser.id).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
            }
            if (method === 'POST') {
                if (path.endsWith('/systems')) {
                    const body = await request.json();
                    const countReq = await env.DB.prepare('SELECT COUNT(*) as count FROM system_tokens WHERE code_id = ?').bind(currentUser.id).first();
                    if (countReq.count >= currentUser.max_systems) {
                        return new Response(JSON.stringify({ error: `הגעת למגבלת המערכות שלך (${currentUser.max_systems})` }), { status: 400 });
                    }
                    await env.DB.prepare('INSERT INTO system_tokens (code_id, description, token) VALUES (?, ?, ?)')
                        .bind(currentUser.id, body.description, body.token).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
            if (method === 'PUT') {
                if (path.includes('/systems/')) {
                    const id = path.split('/').pop();
                    const body = await request.json();
                    await env.DB.prepare('UPDATE system_tokens SET description=?, token=? WHERE id=? AND code_id=?')
                        .bind(body.description, body.token, id, currentUser.id).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
            if (method === 'DELETE') {
                if (path.includes('/systems/')) {
                    const id = path.split('/').pop();
                    await env.DB.prepare('DELETE FROM system_tokens WHERE id=? AND code_id=?').bind(id, currentUser.id).run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
        }

    } catch (e) {
        console.error("API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
}
