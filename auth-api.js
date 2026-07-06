import { sendVerificationEmail } from './email-api.js';

export default async function handleAuthApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await request.json();

        // --- 1. תהליך התחלת הרשמה ---
        if (path.endsWith('/api/auth/register/init')) {
            const { email, phone, name, personalCode } = body;
            
            if (!email || !phone || !name || !personalCode) return new Response(JSON.stringify({ error: 'כל השדות חובה כולל טלפון.' }), { status: 400 });
            if (personalCode.length < 6 || personalCode.length > 15 || !/^\d+$/.test(personalCode)) {
                return new Response(JSON.stringify({ error: 'הקוד האישי שבחרת חייב להיות מורכב מ-6 עד 15 ספרות בלבד.' }), { status: 400 });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: 'כתובת האימייל אינה תקינה.' }), { status: 400 });

            // בדיקת אימייל או טלפון או קוד כפול
            const existing = await env.DB.prepare('SELECT id, email, phone, code FROM access_codes WHERE code = ? OR email = ? OR phone = ?').bind(personalCode, email, phone).first();
            if (existing) {
                if (existing.email === email) return new Response(JSON.stringify({ error: 'כתובת האימייל כבר קיימת במערכת.' }), { status: 400 });
                if (existing.phone === phone) return new Response(JSON.stringify({ error: 'מספר הטלפון כבר קיים במערכת.' }), { status: 400 });
                if (existing.code === personalCode) return new Response(JSON.stringify({ error: 'הקוד האישי כבר תפוס.' }), { status: 400 });
            }

            const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
            await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run();
            await env.DB.prepare('INSERT INTO pending_users (email, code) VALUES (?, ?)').bind(email, verifyCode).run();

            const emailResult = await sendVerificationEmail(email, verifyCode, env);
            if (!emailResult.success) {
                return new Response(JSON.stringify({ error: `שגיאת שרת מייל: ${emailResult.message}` }), { status: 500 });
            }

            return new Response(JSON.stringify({ success: true }));
        }

        // --- 2. תהליך אימות המייל ---
        if (path.endsWith('/api/auth/register/verify')) {
            const { email, phone, verifyCode, name, personalCode } = body;

            if (!email || !phone || !verifyCode || !name || !personalCode) return new Response(JSON.stringify({ error: 'נתונים חסרים.' }), { status: 400 });

            const pending = await env.DB.prepare('SELECT created_at FROM pending_users WHERE email = ? AND code = ?').bind(email, verifyCode).first();
            if (!pending) return new Response(JSON.stringify({ error: 'קוד האימות שגוי.' }), { status: 400 });

            const createdAt = new Date(pending.created_at + 'Z').getTime();
            if (new Date().getTime() - createdAt > 15 * 60 * 1000) {
                await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run();
                return new Response(JSON.stringify({ error: 'קוד האימות פג תוקף.' }), { status: 400 });
            }

            const existing = await env.DB.prepare('SELECT id FROM access_codes WHERE code = ? OR email = ? OR phone = ?').bind(personalCode, email, phone).first();
            if (existing) return new Response(JSON.stringify({ error: 'אחד מהנתונים נתפס בינתיים.' }), { status: 400 });

            await env.DB.prepare('INSERT INTO access_codes (code, owner_name, email, phone, max_systems, is_blocked) VALUES (?, ?, ?, ?, ?, 0)')
                .bind(personalCode, name, email, phone, 5).run();
            await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run();

            return new Response(JSON.stringify({ success: true }));
        }

        // --- 3. התחברות קיימת עם דרישת פרופיל ---
        const { code } = body;
        if (!code) return new Response(JSON.stringify({ error: 'קוד חסר' }), { status: 400 });

        const userCode = await env.DB.prepare('SELECT id, owner_name, email, phone, is_blocked FROM access_codes WHERE code = ?').bind(code).first();
        if (!userCode) return new Response(JSON.stringify({ error: 'קוד שגוי או לא קיים' }), { status: 401 });
        if (userCode.is_blocked === 1) return new Response(JSON.stringify({ error: 'המשתמש חסום. פנה להנהלה.' }), { status: 403 });

        // דרישה ממשתמשים ישנים לעדכן אימייל וטלפון (יוחזר סטטוס מיוחד ל-Frontend שיקפיץ פופאפ)
        if (!userCode.email || !userCode.phone) {
             return new Response(JSON.stringify({ require_profile_update: true, userId: userCode.id }), { status: 403 });
        }

        if (path.endsWith('/api/auth/systems')) {
            const { results } = await env.DB.prepare('SELECT id, description FROM system_tokens WHERE code_id = ?').bind(userCode.id).all();
            return new Response(JSON.stringify({ owner: userCode.owner_name, systems: results }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (path.endsWith('/api/auth/token')) {
            const { systemId } = body;
            const system = await env.DB.prepare('SELECT id, token FROM system_tokens WHERE id = ? AND code_id = ?').bind(systemId, userCode.id).first();
            if (!system) return new Response(JSON.stringify({ error: 'מערכת לא מורשית' }), { status: 403 });

            const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
            await env.DB.prepare('INSERT INTO access_logs (code_id, system_id, ip_address) VALUES (?, ?, ?)').bind(userCode.id, system.id, ip).run();
            return new Response(JSON.stringify({ token: system.token }), { headers: { 'Content-Type': 'application/json' } });
        }

    } catch (e) {
        return new Response(JSON.stringify({ error: 'שגיאת שרת פנימית.' }), { status: 500 });
    }
    return new Response('Not Found', { status: 404 });
}
