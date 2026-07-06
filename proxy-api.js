export default async function handleProxyApi(request, env) {
    const tempCode = request.headers.get('x-temp-code');
    if (!tempCode) return new Response(JSON.stringify({ error: 'חסר קוד זמני' }), { status: 401 });

    const url = new URL(request.url);
    
    let endpoint = url.pathname;
    if (endpoint.startsWith('/sms/api/proxy/')) endpoint = endpoint.replace('/sms/api/proxy/', '');
    else if (endpoint.startsWith('/api/proxy/')) endpoint = endpoint.replace('/api/proxy/', '');
    
    if (!endpoint) return new Response(JSON.stringify({ error: 'נתיב לא תקין' }), { status: 400 });

    const record = await env.DB.prepare(`
        SELECT t.id, t.expires_at, t.is_active, t.permissions, t.whitelist, t.blacklist, s.token as real_token 
        FROM temp_codes t
        JOIN system_tokens s ON t.system_id = s.id
        WHERE UPPER(t.temp_code) = UPPER(?)
    `).bind(tempCode).first();

    if (!record || record.is_active !== 1) {
        return new Response(JSON.stringify({ error: 'קוד זמני שגוי או מושבת' }), { status: 401 });
    }

    if (Date.now() > record.expires_at) {
        return new Response(JSON.stringify({ error: 'הקוד הזמני פג תוקף' }), { status: 401 });
    }

    // --- אכיפת הרשאות Proxy ---
    const isSendingMessage = endpoint.toLowerCase().includes('sendsms');
    if (isSendingMessage && !record.permissions.includes('SEND')) {
        return new Response(JSON.stringify({ error: 'קוד זמני זה מורשה לקריאה בלבד, אינך מורשה לשלוח הודעות.' }), { status: 403 });
    }

    if (isSendingMessage) {
        const phoneNumbers = url.searchParams.get('phones') || '';
        const phonesArr = phoneNumbers.split(',').map(p => p.trim());
        
        // בדיקת רשימה לבנה
        if (record.whitelist && record.whitelist.trim() !== '') {
            const allowed = record.whitelist.split(',').map(p => p.trim());
            const allAllowed = phonesArr.every(p => allowed.includes(p));
            if (!allAllowed) return new Response(JSON.stringify({ error: 'נמען אחד או יותר אינם ברשימה הלבנה המותרת לקוד זה.' }), { status: 403 });
        }
        
        // בדיקת רשימה שחורה
        if (record.blacklist && record.blacklist.trim() !== '') {
            const blocked = record.blacklist.split(',').map(p => p.trim());
            const hasBlocked = phonesArr.some(p => blocked.includes(p));
            if (hasBlocked) return new Response(JSON.stringify({ error: 'נמען אחד או יותר נמצאים ברשימה השחורה ולכן נחסמו.' }), { status: 403 });
        }
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    await env.DB.prepare('INSERT INTO temp_access_logs (temp_code_id, ip_address, endpoint, timestamp) VALUES (?, ?, ?, ?)')
        .bind(record.id, ip, endpoint, Date.now()).run();

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
