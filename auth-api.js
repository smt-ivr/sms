export default async function handleAuthApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return new Response(JSON.stringify({ error: 'קוד חסר' }), { status: 400 });
        }

        // שליפת הקוד כולל בדיקת חסימה
        const userCode = await env.DB.prepare('SELECT id, owner_name, is_blocked FROM access_codes WHERE code = ?')
            .bind(code)
            .first();

        if (!userCode) {
            return new Response(JSON.stringify({ error: 'קוד שגוי או לא קיים' }), { status: 401 });
        }

        if (userCode.is_blocked === 1) {
            return new Response(JSON.stringify({ error: 'המשתמש חסום. פנה להנהלה.' }), { status: 403 });
        }

        if (path.endsWith('/api/auth/systems')) {
            const { results } = await env.DB.prepare('SELECT id, description FROM system_tokens WHERE code_id = ?')
                .bind(userCode.id)
                .all();

            return new Response(JSON.stringify({ owner: userCode.owner_name, systems: results }), {
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        if (path.endsWith('/api/auth/token')) {
            const { systemId } = body;
            
            const system = await env.DB.prepare('SELECT id, token FROM system_tokens WHERE id = ? AND code_id = ?')
                .bind(systemId, userCode.id)
                .first();

            if (!system) {
                return new Response(JSON.stringify({ error: 'מערכת לא מורשית' }), { status: 403 });
            }

            const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
            await env.DB.prepare('INSERT INTO access_logs (code_id, system_id, ip_address) VALUES (?, ?, ?)')
                .bind(userCode.id, system.id, ip)
                .run();

            return new Response(JSON.stringify({ token: system.token }), {
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

    } catch (e) {
        console.error("Auth API Error:", e);
        return new Response(JSON.stringify({ error: 'שגיאת שרת פנימית' }), { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
}
