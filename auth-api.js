import { sendVerificationEmail } from './email-api.js';

export default async function handleAuthApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await request.json();

        // --- 1. תהליך התחלת הרשמה (שליחת קוד למייל) ---
        if (path.endsWith('/api/auth/register/init')) {
            const { email, name, personalCode } = body;
            
            // בדיקות תקינות קפדניות
            if (!email || !name || !personalCode) return new Response(JSON.stringify({ error: 'כל השדות חובה.' }), { status: 400 });
            if (personalCode.length < 6 || personalCode.length > 15 || !/^\d+$/.test(personalCode)) {
                return new Response(JSON.stringify({ error: 'הקוד האישי שבחרת חייב להיות מורכב מ-6 עד 15 ספרות בלבד.' }), { status: 400 });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: 'כתובת האימייל אינה תקינה.' }), { status: 400 });

            // האם הקוד האישי כבר תפוס ע"י מישהו אחר?
            const existingCode = await env.DB.prepare('SELECT id FROM access_codes WHERE code = ?').bind(personalCode).first();
            if (existingCode) return new Response(JSON.stringify({ error: 'הקוד האישי שבחרת כבר תפוס במערכת. בחר קוד אחר.' }), { status: 400 });

            // יצירת קוד אימות ושמירתו בטבלה הזמנית
            const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
            await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run(); // מניעת כפילות אם לחץ פעמיים
            await env.DB.prepare('INSERT INTO pending_users (email, code) VALUES (?, ?)').bind(email, verifyCode).run();

            // שליחת המייל דרך Resend (העברת ה-env כדי למשוך את המפתח הסודי)
            const emailResult = await sendVerificationEmail(email, verifyCode, env);
            if (!emailResult.success) {
                return new Response(JSON.stringify({ error: `שגיאת שרת מייל: ${emailResult.message}` }), { status: 500 });
            }

            return new Response(JSON.stringify({ success: true }));
        }

        // --- 2. תהליך אימות המייל ורישום המשתמש בפועל ---
        if (path.endsWith('/api/auth/register/verify')) {
            const { email, verifyCode, name, personalCode } = body;

            if (!email || !verifyCode || !name || !personalCode) return new Response(JSON.stringify({ error: 'נתונים חסרים, אנא רענן את העמוד.' }), { status: 400 });

            // משיכת הקוד הזמני לבדיקה
            const pending = await env.DB.prepare('SELECT created_at FROM pending_users WHERE email = ? AND code = ?').bind(email, verifyCode).first();
            if (!pending) return new Response(JSON.stringify({ error: 'קוד האימות שגוי. אנא בדוק שוב את המייל.' }), { status: 400 });

            // בדיקת תוקף זמן (15 דקות) - D1 עובד בUTC
            const createdAt = new Date(pending.created_at + 'Z').getTime();
            if (new Date().getTime() - createdAt > 15 * 60 * 1000) {
                await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run();
                return new Response(JSON.stringify({ error: 'קוד האימות פג תוקף. יש להתחיל הרשמה מחדש.' }), { status: 400 });
            }

            // בדיקה שוב שהקוד האישי לא נתפס בזמן הזה
            const existingCode = await env.DB.prepare('SELECT id FROM access_codes WHERE code = ?').bind(personalCode).first();
            if (existingCode) return new Response(JSON.stringify({ error: 'הקוד האישי כבר נתפס במערכת, בחר קוד אחר.' }), { status: 400 });

            // הכל תקין! שמירת המשתמש החדש במסד והענקת 5 מערכות כברירת מחדל
            await env.DB.prepare('INSERT INTO access_codes (code, owner_name, max_systems, is_blocked) VALUES (?, ?, ?, 0)').bind(personalCode, name, 5).run();
            await env.DB.prepare('DELETE FROM pending_users WHERE email = ?').bind(email).run(); // ניקוי

            return new Response(JSON.stringify({ success: true }));
        }

        // --- 3. ההתחברות הרגילה הקיימת ---
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
