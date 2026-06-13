export default async function handleAdminApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 1. שליפת סיסמת המנהל ממסד הנתונים בלבד! (ללא שום גיבוי קשיח)
    let storedAdminPass = null; 
    try {
        const record = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password'").first();
        if (record && record.value) {
            storedAdminPass = record.value;
        }
    } catch (e) {
        console.error("Settings table error:", e);
        // אם יש שגיאה בשליפה ממסד הנתונים - חוסמים את הגישה מיד
        return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. אבטחת פאנל הניהול
    const adminPass = request.headers.get('x-admin-password');
    // אם לא הוזנה סיסמה בבקשה, או שלא קיימת סיסמה במסד הנתונים, או שהן לא תואמות - חוסמים!
    if (!storedAdminPass || adminPass !== storedAdminPass) { 
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        if (request.method === 'GET') {
            if (path.endsWith('/api/admin/codes')) {
                const { results } = await env.DB.prepare('SELECT * FROM access_codes ORDER BY id DESC').all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (path.includes('/api/admin/systems/')) {
                const codeId = path.split('/').pop();
                const { results } = await env.DB.prepare('SELECT * FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(codeId).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
            if (path.endsWith('/api/admin/logs')) {
                const { results } = await env.DB.prepare(`
                    SELECT l.*, c.owner_name, s.description 
                    FROM access_logs l
                    LEFT JOIN access_codes c ON l.code_id = c.id
                    LEFT JOIN system_tokens s ON l.system_id = s.id
                    ORDER BY l.timestamp DESC LIMIT 100
                `).all();
                return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
            }
        }

        if (request.method === 'POST') {
            const body = await request.json();
            
            // נקודת קצה חדשה: שינוי סיסמת מנהל
            if (path.endsWith('/api/admin/settings/password')) {
                const { newPassword } = body;
                if (!newPassword) return new Response(JSON.stringify({ error: 'Missing password' }), { status: 400 });
                
                await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").bind(newPassword).run();
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }

            if (path.endsWith('/api/admin/codes')) {
                const { code, owner_name } = body;
                await env.DB.prepare('INSERT INTO access_codes (code, owner_name) VALUES (?, ?)').bind(code, owner_name).run();
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }
            if (path.endsWith('/api/admin/systems')) {
                const { code_id, description, token } = body;
                await env.DB.prepare('INSERT INTO system_tokens (code_id, description, token) VALUES (?, ?, ?)').bind(code_id, description, token).run();
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }
        }

        if (request.method === 'DELETE') {
            if (path.includes('/api/admin/codes/')) {
                const id = path.split('/').pop();
                await env.DB.prepare('DELETE FROM system_tokens WHERE code_id = ?').bind(id).run();
                await env.DB.prepare('DELETE FROM access_codes WHERE id = ?').bind(id).run();
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }
            if (path.includes('/api/admin/systems/')) {
                const id = path.split('/').pop();
                await env.DB.prepare('DELETE FROM system_tokens WHERE id = ?').bind(id).run();
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }
        }
    } catch (e) {
        console.error("Admin API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
}
