import { sendVerificationEmail } from './email-api.js';

export default async function handleAuthApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });

    try {
        const body = await request.json();

        // --- שלב 1: קבלת אימייל ושליחת קוד אימות ---
        if (path.endsWith('/api/auth/register/init')) {
            const { email } = body;
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: 'כתובת האימייל אינה תקינה.' }), { status: 400 });

            // בדיקה האם האימייל כבר קיים במערכת החשבונות
            const existingUser = await env.DB.prepare('SELECT id FROM access_codes WHERE email = ?').bind(email).first();
            if (existingUser) return new Response(JSON.stringify({ error: 'כתובת אימייל זו כבר רשומה במערכת. אנא התחבר.' }), { status: 400 });

            const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
            await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run(); 
            await env.DB.prepare('INSERT INTO pending_users (email, code) VALUES (?, ?)').bind(email, verifyCode).run();

            const emailResult = await sendVerificationEmail(email, verifyCode, env);
            if (!emailResult.success) return new Response(JSON.stringify({ error: `שגיאת שרת מייל: ${emailResult.message}` }), { status: 500 });

            return new Response(JSON.stringify({ success: true }));
        }

        // --- שלב 2: אימות הקוד ויצירת טוקן-אימייל (תקף לחצי שעה) ---
        if (path.endsWith('/api/auth/register/verify')) {
            const { email, verifyCode } = body;
            if (!email || !verifyCode) return new Response(JSON.stringify({ error: 'נתונים חסרים.' }), { status: 400 });

            const pending = await env.DB.prepare('SELECT created_at FROM pending_users WHERE email = ? AND code = ?').bind(email, verifyCode).first();
            if (!pending) return new Response(JSON.stringify({ error: 'קוד האימות שגוי. אנא בדוק שוב את המייל.' }), { status: 400 });

            // תוקף קוד (15 דקות)
            const createdAt = new Date(pending.created_at + 'Z').getTime();
            if (new Date().getTime() - createdAt > 15 * 60 * 1000) {
                await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run();
                return new Response(JSON.stringify({ error: 'קוד האימות פג תוקף.' }), { status: 400 });
            }

            // יצירת טוקן מאובטח והעברה לטבלת המאומתים
            const mailToken = crypto.randomUUID(); 
            await env.DB.prepare('DELETE FROM verified_emails WHERE email = ?').bind(email).run(); // ניקוי טוקנים ישנים
            await env.DB.prepare('INSERT INTO verified_emails (token, email) VALUES (?, ?)').bind(mailToken, email).run();
            await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run();

            // שולחים ללקוח את הטוקן, ולא משתמשים באימייל החשוף יותר
            return new Response(JSON.stringify({ success: true, mailToken: mailToken }));
        }

        // --- שלב 3: סיום הרשמה על בסיס הטוקן בלבד ---
        if (path.endsWith('/api/auth/register/complete')) {
            const { mailToken, name, personalCode } = body;

            if (!mailToken || !name || !personalCode) return new Response(JSON.stringify({ error: 'נתונים חסרים להשלמת ההרשמה.' }), { status: 400 });
            if (personalCode.length < 6 || personalCode.length > 15 || !/^\d+$/.test(personalCode)) {
                return new Response(JSON.stringify({ error: 'הקוד האישי חייב להכיל 6 עד 15 ספרות בלבד.' }), { status: 400 });
            }

            // אימות שהטוקן חוקי
            const verified = await env.DB.prepare('SELECT email, created_at FROM verified_emails WHERE token = ?').bind(mailToken).first();
            if (!verified) return new Response(JSON.stringify({ error: 'טוקן אימות חסר או שגוי. אנא אמת את המייל מחדש.' }), { status: 403 });

            // בדיקת תוקף טוקן (30 דקות)
            const tokenCreatedAt = new Date(verified.created_at + 'Z').getTime();
            if (new Date().getTime() - tokenCreatedAt > 30 * 60 * 1000) {
                await env.DB.prepare('DELETE FROM verified_emails WHERE token = ?').bind(mailToken).run();
                return new Response(JSON.stringify({ error: 'טוקן האימייל פג תוקף (מעל 30 דקות). אנא התחל הרשמה מחדש.' }), { status: 403 });
            }

            // בדיקה שהקוד האישי פנוי
            const existingCode = await env.DB.prepare('SELECT id FROM access_codes WHERE code = ?').bind(personalCode).first();
            if (existingCode) return new Response(JSON.stringify({ error: 'הקוד האישי שבחרת כבר תפוס במערכת. בחר קוד אחר.' }), { status: 400 });

            // יצירת החשבון המלא ושמירת האימייל במסד הנתונים
            await env.DB.prepare('INSERT INTO access_codes (code, owner_name, email, max_systems, is_blocked) VALUES (?, ?, ?, ?, 0)')
                          .bind(personalCode, name, verified.email, 5).run();
            
            // שריפת הטוקן כדי שלא יוכל לשמש שוב
            await env.DB.prepare('DELETE FROM verified_emails WHERE token = ?').bind(mailToken).run();

            return new Response(JSON.stringify({ success: true }));
        }

        // --- התחברות רגילה למערכת ---
        const { code } = body;
        if (!code) return new Response(JSON.stringify({ error: 'קוד חסר' }), { status: 400 });

        const userCode = await env.DB.prepare('SELECT id, owner_name, is_blocked FROM access_codes WHERE code = ?').bind(code).first();
        if (!userCode) return new Response(JSON.stringify({ error: 'קוד שגוי או לא קיים' }), { status: 401 });
        if (userCode.is_blocked === 1) return new Response(JSON.stringify({ error: 'המשתמש חסום. פנה להנהלה.' }), { status: 403 });

        if (path.endsWith('/api/auth/systems')) {
            const { results } = await env.DB.prepare('SELECT id, description FROM system_tokens WHERE code_id = ?').bind(userCode.id).all();
            return new Response(JSON.stringify({ owner: userCode.owner_name, systems: results }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }

        if (path.endsWith('/api/auth/token')) {
            const { systemId } = body;
            const system = await env.DB.prepare('SELECT id, token FROM system_tokens WHERE id = ? AND code_id = ?').bind(systemId, userCode.id).first();
            if (!system) return new Response(JSON.stringify({ error: 'מערכת לא מורשית' }), { status: 403 });

            const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
            await env.DB.prepare('INSERT INTO access_logs (code_id, system_id, ip_address) VALUES (?, ?, ?)').bind(userCode.id, system.id, ip).run();
            return new Response(JSON.stringify({ token: system.token }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
        }

    } catch (e) {
        console.error("Auth API Error:", e);
        return new Response(JSON.stringify({ error: 'שגיאת שרת פנימית. נסה שוב.' }), { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
}
