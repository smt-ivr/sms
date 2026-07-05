export default async function handleProxyApi(request, env) {
    const tempCode = request.headers.get('x-temp-code');
    if (!tempCode) return new Response(JSON.stringify({ error: 'חסר קוד זמני' }), { status: 401 });

    const url = new URL(request.url);
    const endpoint = url.pathname.replace('/api/proxy/', '');
    if (!endpoint) return new Response(JSON.stringify({ error: 'נתיב לא תקין' }), { status: 400 });

    // משיכת הקוד ובדיקת תוקף
    const record = await env.DB.prepare(`
        SELECT t.id, t.expires_at, t.is_active, s.token as real_token 
        FROM temp_codes t
        JOIN system_tokens s ON t.system_id = s.id
        WHERE t.temp_code = ?
    `).bind(tempCode).first();

    if (!record || record.is_active !== 1) {
        return new Response(JSON.stringify({ error: 'קוד זמני שגוי או מושבת' }), { status: 401 });
    }

    if (Date.now() > record.expires_at) {
        return new Response(JSON.stringify({ error: 'הקוד הזמני פג תוקף' }), { status: 401 });
    }

    // תיעוד הפעולה בלוגים
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    await env.DB.prepare('INSERT INTO temp_access_logs (temp_code_id, ip_address, endpoint, timestamp) VALUES (?, ?, ?, ?)')
        .bind(record.id, ip, endpoint, Date.now()).run();

    // בניית הבקשה לימות המשיח
    const targetUrl = new URL(`https://www.call2all.co.il/ym/api/${endpoint}`);
    targetUrl.searchParams.set('token', record.real_token);
    url.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    try {
        const proxyRes = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/json' },
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
        });
        const data = await proxyRes.text();
        return new Response(data, { 
            status: proxyRes.status,
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'שגיאת תקשורת מול היעד' }), { status: 500 });
    }
}
