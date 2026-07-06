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

    if (path.includes('/api/admin') && !isAdmin) return new Response(JSON.stringify({ error: 'Unauthorized Admin' }), { status: 401 });
    if (path.includes('/api/user') && !isUser) return new Response(JSON.stringify({ error: 'Unauthorized User or Blocked' }), { status: 401 });

    try {
        const method = request.method;

        // ==========================================
        //  API עבור מנהל המערכת
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
                if (path.endsWith('/tickets')) {
                    const { results } = await env.DB.prepare('SELECT t.*, a.owner_name, a.email FROM tickets t JOIN access_codes a ON t.code_id = a.id ORDER BY t.id DESC').all();
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
                if (path.endsWith('/tickets/respond')) {
                    // עדכון התשובה לפניה ושליחת מייל
                    await env.DB.prepare("UPDATE tickets SET status = 'CLOSED', response = ? WHERE id = ?").bind(body.response, body.ticketId).run();
                    const ticket = await env.DB.prepare('SELECT t.subject, a.email FROM tickets t JOIN access_codes a ON t.code_id = a.id WHERE t.id = ?').bind(body.ticketId).first();
                    // כאן קוראים לפונקציית שליחת המייל (הוסף אותה ב email-api)
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
                if (path.endsWith('/temp_codes')) {
                    // המשתמש רואה את הראוט אבל אם הוא לא מורשה ליצור הוא יראה אזהרה ב-UI, אנחנו נחזיר לו נתונים בכל מקרה אם יש לו היסטוריה
                    const { results } = await env.DB.prepare(`
                        SELECT t.*, s.description as system_desc, 
                        (SELECT COUNT(*) FROM temp_access_logs WHERE temp_code_id = t.id) as usage_count
                        FROM temp_codes t JOIN system_tokens s ON t.system_id = s.id 
                        WHERE t.code_id = ? ORDER BY t.id DESC
                    `).bind(currentUser.id).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
                if (path.endsWith('/tickets')) {
                    const { results } = await env.DB.prepare('SELECT * FROM tickets WHERE code_id = ? ORDER BY id DESC').bind(currentUser.id).all();
                    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
                }
            }
            if (method === 'POST') {
                if (path.endsWith('/tickets')) {
                    const body = await request.json();
                    await env.DB.prepare('INSERT INTO tickets (code_id, subject, message, created_at) VALUES (?, ?, ?, ?)').bind(currentUser.id, body.subject, body.message, Date.now()).run();
                    return new Response(JSON.stringify({ success: true }));
                }
                if (path.endsWith('/temp_codes')) {
                    if (!currentUser.allow_temp_codes) return new Response(JSON.stringify({error: 'אין לך הרשאה להנפיק קודים זמניים. פנה להנהלה.'}), {status: 403});
                    const body = await request.json();
                    
                    let tempCodeStr = body.customCode ? body.customCode.trim().toUpperCase() : '';
                    if (!tempCodeStr) tempCodeStr = body.isNumeric ? Math.floor(100000 + Math.random() * 900000).toString() : Math.random().toString(36).substring(2, 10).toUpperCase();

                    // שימוש בשעת תפוגה מדויקת שהגיעה מהלקוח
                    const expiresAt = body.exactExpiresAt ? new Date(body.exactExpiresAt).getTime() : Date.now() + (body.durationMinutes * 60 * 1000);
                    const permissions = body.canSend ? 'READ,SEND' : 'READ';

                    await env.DB.prepare('INSERT INTO temp_codes (code_id, system_id, temp_code, expires_at, permissions, whitelist, blacklist) VALUES (?, ?, ?, ?, ?, ?, ?)')
                        .bind(currentUser.id, body.systemId, tempCodeStr, expiresAt, permissions, body.whitelist || '', body.blacklist || '').run();
                    return new Response(JSON.stringify({ success: true }));
                }
            }
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Not Found', { status: 404 });
}
