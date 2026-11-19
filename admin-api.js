import { json, fail, normalizePhone, senderKey, isPhoneLike, PERMANENT_EXPIRY, parseIpRule, splitList } from './http.js';
import { callYm } from './ym.js';
import { tempCodeMail, sendMail, validEmail } from './mail.js';
import { ensureSchema } from './schema.js';

// קריאת הגדרות ההרשאה של קוד זמני מגוף הבקשה
function parseTempScope(body) {
    // מספרי טלפון או שמות שולחים (למשל GOVil). שורה / פסיק = הפרדה
    const rawPhones = Array.isArray(body.allowedPhones)
        ? body.allowedPhones
        : String(body.allowedPhones || '').split(/[,;\n]+/);
    const phones = [];
    const keys = new Set();
    for (const raw of rawPhones.map(p => String(p).trim()).filter(Boolean)) {
        let value;
        if (isPhoneLike(raw)) {
            value = normalizePhone(raw);
            if (!/^\d{3,15}$/.test(value)) return { error: fail('BAD_REQUEST', `מספר טלפון לא תקין: ${raw}`, { field: 'allowedPhones' }) };
        } else {
            value = raw.replace(/\s+/g, ' ');
            if (value.length > 30 || /[\u0000-\u001f]/.test(value)) {
                return { error: fail('BAD_REQUEST', `שם שולח לא תקין (עד 30 תווים): ${raw}`, { field: 'allowedPhones' }) };
            }
        }
        const key = senderKey(value);
        if (!keys.has(key)) { keys.add(key); phones.push(value); }
    }
    if (phones.length > 50) return { error: fail('BAD_REQUEST', 'ניתן להגביל עד 50 שולחים לקוד', { field: 'allowedPhones' }) };

    const ips = [];
    for (const rule of splitList(body.allowedIps)) {
        if (!parseIpRule(rule)) return { error: fail('BAD_REQUEST', `כתובת IP לא תקינה: ${rule}`, { field: 'allowedIps' }) };
        if (!ips.includes(rule)) ips.push(rule);
    }
    if (ips.length > 20) return { error: fail('BAD_REQUEST', 'ניתן להגדיר עד 20 כתובות IP לקוד', { field: 'allowedIps' }) };

    const flag = (v, def) => (v === undefined ? def : (v ? 1 : 0));
    const scope = {
        ips: ips.join(','),
        lock_first_ip: flag(body.lockFirstIp, 0),
        phones: phones.join(','),
        allow_incoming: flag(body.allowIncoming, 1),
        allow_outgoing: flag(body.allowOutgoing, 1),
        allow_send: flag(body.allowSend, 0),
        label: String(body.label || '').trim().slice(0, 100),
    };
    if (!scope.allow_incoming && !scope.allow_outgoing && !scope.allow_send) {
        return { error: fail('BAD_REQUEST', 'יש לבחור לפחות הרשאה אחת', { field: 'permissions' }) };
    }
    return scope;
}

// קריאת התוקף המבוקש:
//   { mode: 'minutes', minutes: 60 } | { mode: 'until', until: <ms> } | { mode: 'permanent' }
// (תאימות לאחור: durationMinutes)
const MAX_MINUTES = 60 * 24 * 365 * 10;
function parseExpiry(body) {
    const e = body.expiry || { mode: 'minutes', minutes: body.durationMinutes };
    if (e.mode === 'permanent') return { expiresAt: PERMANENT_EXPIRY };
    if (e.mode === 'until') {
        const t = Math.floor(Number(e.until));
        if (!Number.isFinite(t) || t <= Date.now()) return { error: fail('BAD_REQUEST', 'תאריך התפוגה חייב להיות בעתיד', { field: 'expiry' }) };
        return { expiresAt: Math.min(t, PERMANENT_EXPIRY) };
    }
    if (e.mode === 'minutes' || e.mode === undefined) {
        const m = parseInt(e.minutes, 10);
        if (!Number.isFinite(m) || m < 1 || m > MAX_MINUTES) return { error: fail('BAD_REQUEST', 'משך הזמן חייב להיות בין דקה אחת ל-10 שנים', { field: 'expiry' }) };
        return { expiresAt: Date.now() + m * 60 * 1000 };
    }
    return { error: fail('BAD_REQUEST', 'סוג תוקף לא מוכר', { field: 'expiry' }) };
}

export default async function handleAdminApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.includes('/temp_codes')) {
        try { await ensureSchema(env); }
        catch (e) { return fail('INTERNAL_ERROR', 'שגיאה בעדכון מבנה מסד הנתונים'); }
    }

    let storedAdminPass = null; 
    try {
        const record = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password'").first();
        if (record && record.value) storedAdminPass = record.value;
    } catch (e) {
        return json({ error: 'Database error' }, { status: 500 });
    }

    const adminPass = request.headers.get('x-admin-password');
    const isAdmin = storedAdminPass && adminPass === storedAdminPass;

    const userCodeHeader = request.headers.get('x-user-code');
    let currentUser = null;
    if (userCodeHeader) {
        currentUser = await env.DB.prepare('SELECT * FROM access_codes WHERE code = ?').bind(userCodeHeader).first();
    }
    const isUser = currentUser && currentUser.is_blocked !== 1;

    if (path.includes('/api/admin') && !isAdmin) return json({ error: 'Unauthorized Admin' }, { status: 401 });
    if (path.includes('/api/user') && !isUser) return json({ error: 'Unauthorized User or Blocked' }, { status: 401 });

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
                    return json(results);
                }
                if (path.includes('/systems/')) {
                    const codeId = path.split('/').pop();
                    const { results } = await env.DB.prepare('SELECT * FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(codeId).all();
                    return json(results);
                }
                if (path.endsWith('/logs')) {
                    const { results } = await env.DB.prepare(`
                        SELECT l.*, c.owner_name, s.description FROM access_logs l
                        LEFT JOIN access_codes c ON l.code_id = c.id
                        LEFT JOIN system_tokens s ON l.system_id = s.id
                        ORDER BY l.timestamp DESC LIMIT 200
                    `).all();
                    return json(results);
                }
            }
            if (method === 'POST') {
                const body = await request.json();
                if (path.endsWith('/settings/password')) {
                    await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").bind(body.newPassword).run();
                    return json({ success: true });
                }
                if (path.endsWith('/codes')) {
                    const conflict = await env.DB.prepare('SELECT id FROM temp_codes WHERE UPPER(temp_code) = UPPER(?) AND expires_at > ?').bind(body.code, Date.now()).first();
                    if(conflict) return json({ error: 'הקוד הסודי כבר בשימוש כקוד זמני במערכת' }, { status: 400 });
                    
                    await env.DB.prepare('INSERT INTO access_codes (code, owner_name, max_systems, is_blocked, allow_temp_codes) VALUES (?, ?, ?, ?, ?)')
                        .bind(body.code, body.owner_name, body.max_systems || 5, body.is_blocked || 0, body.allow_temp_codes || 0).run();
                    return json({ success: true });
                }
            }
            if (method === 'PUT') {
                const body = await request.json();
                if (path.includes('/codes/')) {
                    const id = path.split('/').pop();
                    const conflict = await env.DB.prepare('SELECT id FROM temp_codes WHERE UPPER(temp_code) = UPPER(?) AND expires_at > ?').bind(body.code, Date.now()).first();
                    if(conflict) return json({ error: 'הקוד הסודי כבר בשימוש כקוד זמני במערכת' }, { status: 400 });

                    await env.DB.prepare('UPDATE access_codes SET code=?, owner_name=?, max_systems=?, is_blocked=?, allow_temp_codes=? WHERE id=?')
                        .bind(body.code, body.owner_name, body.max_systems, body.is_blocked, body.allow_temp_codes || 0, id).run();
                    return json({ success: true });
                }
            }
            if (method === 'DELETE') {
                if (path.includes('/codes/')) {
                    const id = path.split('/').pop();
                    await env.DB.prepare('DELETE FROM temp_access_logs WHERE temp_code_id IN (SELECT id FROM temp_codes WHERE code_id = ?)').bind(id).run();
                    await env.DB.prepare('DELETE FROM temp_codes WHERE code_id = ?').bind(id).run();
                    await env.DB.prepare('DELETE FROM system_tokens WHERE code_id = ?').bind(id).run();
                    await env.DB.prepare('DELETE FROM access_codes WHERE id = ?').bind(id).run();
                    return json({ success: true });
                }
            }
        }

        // ==========================================
        //  API עבור משתמשים (User Portal)
        // ==========================================
        if (path.includes('/api/user')) {
            if (method === 'GET') {
                // רשימת השולחים שכתבו למערכת - לבחירה בהגבלת קוד זמני
                const sendersMatch = path.match(/\/api\/user\/systems\/(\d+)\/senders$/);
                if (sendersMatch) {
                    const sys = await env.DB.prepare('SELECT token FROM system_tokens WHERE id = ? AND code_id = ?').bind(sendersMatch[1], currentUser.id).first();
                    if (!sys) return fail('NOT_FOUND', 'המערכת לא נמצאה בחשבון שלך');
                    const res = await callYm('GetIncomingSms', sys.token, { limit: 3000 });
                    if (res.error) return res.error;
                    const map = new Map();
                    for (const row of res.data.rows || []) {
                        const raw = String(row.source ?? '').trim();
                        if (!raw) continue;
                        const sender = isPhoneLike(raw) ? normalizePhone(raw) : raw;
                        const key = senderKey(sender);
                        const item = map.get(key) || { sender, count: 0, last: '' };
                        item.count++;
                        if (String(row.receive_date || '') > item.last) item.last = String(row.receive_date || '');
                        map.set(key, item);
                    }
                    const senders = [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
                    return json({ ok: true, count: senders.length, senders });
                }
                if (path.endsWith('/data')) {
                    const systems = await env.DB.prepare('SELECT id, description, token FROM system_tokens WHERE code_id = ? ORDER BY id DESC').bind(currentUser.id).all();
                    return json({ user: currentUser, systems: systems.results, client_ip: request.headers.get('CF-Connecting-IP') || '' });
                }
                if (path.endsWith('/logs')) {
                    const { results } = await env.DB.prepare(`
                        SELECT l.timestamp, s.description, l.ip_address 
                        FROM access_logs l LEFT JOIN system_tokens s ON l.system_id = s.id
                        WHERE l.code_id = ? ORDER BY l.timestamp DESC LIMIT 50
                    `).bind(currentUser.id).all();
                    return json(results);
                }
                if (path.endsWith('/temp_codes')) {
                    if (!currentUser.allow_temp_codes) return json({error: 'אין הרשאה'}, {status: 403});
                    const { results } = await env.DB.prepare(`
                        SELECT t.*, s.description as system_desc, 
                        (SELECT COUNT(*) FROM temp_access_logs WHERE temp_code_id = t.id) as usage_count
                        FROM temp_codes t JOIN system_tokens s ON t.system_id = s.id 
                        WHERE t.code_id = ? ORDER BY t.id DESC
                    `).bind(currentUser.id).all();
                    return json(results);
                }
            }
            if (method === 'POST') {
                // שליחת קוד זמני במייל מעוצב עם קישור כניסה ישירה (preview=true מחזיר רק את ה-HTML)
                const mailMatch = path.match(/\/api\/user\/temp_codes\/(\d+)\/email$/);
                if (mailMatch) {
                    if (!currentUser.allow_temp_codes) return fail('PERMISSION_DENIED', 'אין הרשאה לקודים זמניים');
                    const body = await request.json().catch(() => ({}));
                    const tc = await env.DB.prepare('SELECT * FROM temp_codes WHERE id = ? AND code_id = ?').bind(mailMatch[1], currentUser.id).first();
                    if (!tc) return fail('NOT_FOUND', 'הקוד לא נמצא בחשבון שלך');

                    const to = String(body.to || '').trim().toLowerCase();
                    if (!body.preview && !validEmail(to)) return fail('BAD_REQUEST', 'כתובת המייל אינה תקינה', { field: 'to' });

                    const mail = tempCodeMail({
                        code: tc.temp_code,
                        link: `${url.origin}/sms?code=${encodeURIComponent(tc.temp_code)}`,
                        recipientName: String(body.name || '').trim().slice(0, 60),
                        senderName: currentUser.owner_name,
                        message: String(body.message || '').trim().slice(0, 1000),
                        phones: String(tc.allowed_phones || '').split(',').filter(Boolean),
                        permissions: { incoming: !!tc.allow_incoming, outgoing: !!tc.allow_outgoing, send: !!tc.allow_send },
                        expiresAt: tc.expires_at,
                    });
                    if (body.preview) return json({ ok: true, subject: mail.subject, html: mail.html });

                    if (!tc.is_active || Date.now() > tc.expires_at) {
                        return fail('BAD_REQUEST', 'הקוד מושבת או שפג תוקפו - הפעילו / האריכו אותו לפני השליחה');
                    }
                    const sent = await sendMail(env, { to, ...mail, fromName: `${currentUser.owner_name} · S.M.T` });
                    if (!sent.ok) return fail(sent.status === 409 ? 'MAIL_NOT_CONFIGURED' : 'MAIL_FAILED', sent.error);
                    return json({ ok: true, success: true, to });
                }
                if (path.endsWith('/systems')) {
                    const body = await request.json();
                    const countReq = await env.DB.prepare('SELECT COUNT(*) as count FROM system_tokens WHERE code_id = ?').bind(currentUser.id).first();
                    if (countReq.count >= currentUser.max_systems) {
                        return json({ error: `הגעת למגבלת המערכות שלך (${currentUser.max_systems})` }, { status: 400 });
                    }
                    await env.DB.prepare('INSERT INTO system_tokens (code_id, description, token) VALUES (?, ?, ?)')
                        .bind(currentUser.id, body.description, body.token).run();
                    return json({ success: true });
                }
                if (path.endsWith('/temp_codes')) {
                    if (!currentUser.allow_temp_codes) return json({error: 'אין הרשאה'}, {status: 403});
                    const body = await request.json();

                    // המערכת חייבת להיות שייכת למשתמש
                    const ownSystem = await env.DB.prepare('SELECT id FROM system_tokens WHERE id = ? AND code_id = ?').bind(body.systemId, currentUser.id).first();
                    if (!ownSystem) return fail('BAD_REQUEST', 'המערכת שנבחרה אינה שייכת לחשבון שלך', { field: 'systemId' });

                    const expiry = parseExpiry(body);
                    if (expiry.error) return expiry.error;

                    const scope = parseTempScope(body);
                    if (scope.error) return scope.error;

                    let tempCodeStr = body.customCode ? body.customCode.trim().toUpperCase() : '';
                    if (!tempCodeStr) {
                        tempCodeStr = body.isNumeric 
                            ? Math.floor(100000 + Math.random() * 900000).toString() 
                            : Math.random().toString(36).substring(2, 10).toUpperCase();
                    }

                    // מניעת התנגשות קודים חכמה
                    const conflictAccess = await env.DB.prepare('SELECT id FROM access_codes WHERE UPPER(code) = ?').bind(tempCodeStr).first();
                    const conflictTemp = await env.DB.prepare('SELECT id FROM temp_codes WHERE UPPER(temp_code) = ? AND expires_at > ? AND is_active = 1').bind(tempCodeStr, Date.now()).first();
                    
                    if (conflictAccess || conflictTemp) {
                        return json({error: 'הקוד שבחרת (או שהוגרל) כבר קיים במערכת, בחר קוד אחר.'}, {status: 400});
                    }

                    const expiresAt = expiry.expiresAt;
                    await env.DB.prepare(`INSERT INTO temp_codes
                        (code_id, system_id, temp_code, expires_at, allowed_phones, allow_incoming, allow_outgoing, allow_send, label, allowed_ips, lock_first_ip)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                        .bind(currentUser.id, body.systemId, tempCodeStr, expiresAt,
                              scope.phones, scope.allow_incoming, scope.allow_outgoing, scope.allow_send, scope.label,
                              scope.ips, scope.lock_first_ip).run();
                    return json({ success: true, ok: true, temp_code: tempCodeStr, expires_at: expiresAt });
                }
            }
            if (method === 'PUT') {
                if (path.includes('/systems/')) {
                    const id = path.split('/').pop();
                    const body = await request.json();
                    await env.DB.prepare('UPDATE system_tokens SET description=?, token=? WHERE id=? AND code_id=?')
                        .bind(body.description, body.token, id, currentUser.id).run();
                    return json({ success: true });
                }
                if (path.includes('/temp_codes/')) {
                    if (!currentUser.allow_temp_codes) return json({error: 'אין הרשאה'}, {status: 403});
                    const id = path.split('/').pop();
                    const body = await request.json();
                    if (body.action === 'extend') {
                        const addMs = (body.minutes || 10) * 60 * 1000;
                        await env.DB.prepare('UPDATE temp_codes SET expires_at = MAX(expires_at, ?) + ? WHERE id = ? AND code_id = ?')
                            .bind(Date.now(), addMs, id, currentUser.id).run();
                    } else if (body.action === 'rename') {
                        // החלפת הקוד בלבד - הרשאות, תוקף והגבלות נשארים
                        let newCode = String(body.newCode || '').trim().toUpperCase();
                        if (!newCode) {
                            newCode = body.isNumeric
                                ? Math.floor(100000 + Math.random() * 900000).toString()
                                : Math.random().toString(36).substring(2, 10).toUpperCase();
                        }
                        if (!/^[A-Z0-9_-]{3,30}$/.test(newCode)) {
                            return fail('BAD_REQUEST', 'הקוד חייב להכיל 3 עד 30 תווים: אותיות באנגלית, ספרות, מקף או קו תחתון', { field: 'newCode' });
                        }
                        const own = await env.DB.prepare('SELECT id FROM temp_codes WHERE id = ? AND code_id = ?').bind(id, currentUser.id).first();
                        if (!own) return fail('NOT_FOUND', 'הקוד לא נמצא בחשבון שלך');
                        const conflictAccess = await env.DB.prepare('SELECT id FROM access_codes WHERE UPPER(code) = ?').bind(newCode).first();
                        const conflictTemp = await env.DB.prepare('SELECT id FROM temp_codes WHERE UPPER(temp_code) = ? AND id != ? AND expires_at > ? AND is_active = 1').bind(newCode, id, Date.now()).first();
                        if (conflictAccess || conflictTemp) return fail('BAD_REQUEST', 'הקוד שבחרת (או שהוגרל) כבר קיים במערכת, בחר קוד אחר.', { field: 'newCode' });
                        await env.DB.prepare('UPDATE temp_codes SET temp_code = ? WHERE id = ? AND code_id = ?').bind(newCode, id, currentUser.id).run();
                        return json({ success: true, ok: true, temp_code: newCode });
                    } else if (body.action === 'expiry') {
                        const expiry = parseExpiry(body);
                        if (expiry.error) return expiry.error;
                        await env.DB.prepare('UPDATE temp_codes SET expires_at = ? WHERE id = ? AND code_id = ?')
                            .bind(expiry.expiresAt, id, currentUser.id).run();
                    } else if (body.action === 'toggle') {
                        await env.DB.prepare('UPDATE temp_codes SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ? AND code_id = ?')
                            .bind(id, currentUser.id).run();
                    } else if (body.action === 'scope') {
                        const scope = parseTempScope(body);
                        if (scope.error) return scope.error;
                        await env.DB.prepare('UPDATE temp_codes SET allowed_phones = ?, allow_incoming = ?, allow_outgoing = ?, allow_send = ?, label = ?, allowed_ips = ?, lock_first_ip = ? WHERE id = ? AND code_id = ?')
                            .bind(scope.phones, scope.allow_incoming, scope.allow_outgoing, scope.allow_send, scope.label,
                                  scope.ips, scope.lock_first_ip, id, currentUser.id).run();
                    } else {
                        return fail('BAD_REQUEST', 'פעולה לא מוכרת', { field: 'action' });
                    }
                    return json({ success: true });
                }
            }
            if (method === 'DELETE') {
                if (path.includes('/systems/')) {
                    const id = path.split('/').pop();
                    await env.DB.prepare('DELETE FROM temp_access_logs WHERE temp_code_id IN (SELECT id FROM temp_codes WHERE system_id = ? AND code_id = ?)').bind(id, currentUser.id).run();
                    await env.DB.prepare('DELETE FROM temp_codes WHERE system_id = ? AND code_id = ?').bind(id, currentUser.id).run();
                    await env.DB.prepare('DELETE FROM system_tokens WHERE id=? AND code_id=?').bind(id, currentUser.id).run();
                    return json({ success: true });
                }
                if (path.includes('/temp_codes/')) {
                    if (!currentUser.allow_temp_codes) return json({error: 'אין הרשאה'}, {status: 403});
                    const id = path.split('/').pop();
                    await env.DB.prepare('DELETE FROM temp_access_logs WHERE temp_code_id = ?').bind(id).run();
                    await env.DB.prepare('DELETE FROM temp_codes WHERE id = ? AND code_id = ?').bind(id, currentUser.id).run();
                    return json({ success: true });
                }
            }
        }

    } catch (e) {
        console.error("API Error:", e);
        return fail('INTERNAL_ERROR', e.message);
    }

    return fail('NOT_FOUND');
}
