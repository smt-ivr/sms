// ==========================================
//  התראות במייל על כל SMS נכנס
// ==========================================
// 1. המשתמש נרשם בפורטל (מערכת + מייל) -> נשלח מייל אישור.
// 2. רק אחרי לחיצה על "אישור" ההרשמה פעילה (status = active).
// 3. משימה מתוזמנת (cron, כל דקה) בודקת הודעות חדשות בימות המשיח ושולחת מייל.
//    עד 5 הודעות חדשות - מייל לכל הודעה. יותר - מייל אחד מרוכז.
// 4. בכל מייל יש קישור להפסקת ההתראות.

import { json, fail, randomToken } from './http.js';
import { ensureSchema } from './schema.js';
import { callYm } from './ym.js';
import { sendMail, validEmail, notifyConfirmMail, smsNotifyMail, resultPage } from './mail.js';

const MAX_SUBS_PER_USER = 10;
const MAX_SINGLE_MAILS = 5;
const SITE = 'https://smti.uk';

const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

// ------------------------------------------
//  API לפורטל: /api/user/notify
// ------------------------------------------
export async function handleNotifyApi(request, env, user, url) {
    await ensureSchema(env);
    const path = url.pathname;
    const method = request.method;
    const idMatch = path.match(/\/api\/user\/notify\/(\d+)$/);

    if (method === 'GET' && !idMatch) {
        const { results } = await env.DB.prepare(`
            SELECT n.id, n.system_id, n.email, n.status, n.created_at, n.confirmed_at, n.last_checked_at,
                   n.last_sent_at, n.sent_count, n.last_error, s.description AS system_desc
            FROM sms_notify n JOIN system_tokens s ON n.system_id = s.id
            WHERE n.code_id = ? ORDER BY n.id DESC`).bind(user.id).all();
        return json({ ok: true, subscriptions: results });
    }

    if (method === 'POST' && !idMatch) {
        const body = await request.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase();
        if (!validEmail(email)) return fail('BAD_REQUEST', 'כתובת המייל אינה תקינה', { field: 'email' });
        const sys = await env.DB.prepare('SELECT id, description FROM system_tokens WHERE id = ? AND code_id = ?').bind(body.systemId, user.id).first();
        if (!sys) return fail('BAD_REQUEST', 'המערכת שנבחרה אינה שייכת לחשבון שלך', { field: 'systemId' });

        const dup = await env.DB.prepare('SELECT id FROM sms_notify WHERE code_id = ? AND system_id = ? AND email = ?').bind(user.id, sys.id, email).first();
        if (dup) return fail('BAD_REQUEST', 'כבר קיימת הרשמה למייל הזה במערכת הזו');
        const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM sms_notify WHERE code_id = ?').bind(user.id).first();
        if (count.c >= MAX_SUBS_PER_USER) return fail('BAD_REQUEST', `ניתן להגדיר עד ${MAX_SUBS_PER_USER} התראות`);

        const confirmToken = randomToken();
        await env.DB.prepare(`INSERT INTO sms_notify (code_id, system_id, email, status, confirm_token, unsub_token, created_at)
            VALUES (?, ?, ?, 'pending', ?, ?, ?)`).bind(user.id, sys.id, email, confirmToken, randomToken(), Date.now()).run();

        const sent = await sendConfirm(env, { email, systemName: sys.description, confirmToken, ownerName: user.owner_name });
        if (!sent.ok) return fail(sent.status === 409 ? 'MAIL_NOT_CONFIGURED' : 'MAIL_FAILED', `ההרשמה נשמרה, אבל מייל האישור לא נשלח: ${sent.error}`);
        return json({ ok: true, success: true, status: 'pending' });
    }

    if (idMatch) {
        const sub = await env.DB.prepare(`SELECT n.*, s.description AS system_desc FROM sms_notify n JOIN system_tokens s ON n.system_id = s.id
            WHERE n.id = ? AND n.code_id = ?`).bind(idMatch[1], user.id).first();
        if (!sub) return fail('NOT_FOUND', 'ההרשמה לא נמצאה');

        if (method === 'DELETE') {
            await env.DB.prepare('DELETE FROM sms_notify WHERE id = ?').bind(sub.id).run();
            return json({ ok: true, success: true });
        }
        if (method === 'PUT') {
            const body = await request.json().catch(() => ({}));
            if (body.action === 'resend') {
                if (sub.status !== 'pending') return fail('BAD_REQUEST', 'ההרשמה כבר אושרה');
                const sent = await sendConfirm(env, { email: sub.email, systemName: sub.system_desc, confirmToken: sub.confirm_token, ownerName: user.owner_name });
                if (!sent.ok) return fail(sent.status === 409 ? 'MAIL_NOT_CONFIGURED' : 'MAIL_FAILED', sent.error);
                return json({ ok: true, success: true });
            }
            if (body.action === 'pause' || body.action === 'resume') {
                if (sub.status === 'pending') return fail('BAD_REQUEST', 'יש לאשר את ההרשמה מהמייל קודם');
                // בחידוש מתחילים מעכשיו - בלי לשלוח את כל מה שהצטבר בהשהיה
                await env.DB.prepare("UPDATE sms_notify SET status = ?, last_seen = CASE WHEN ? = 'active' THEN NULL ELSE last_seen END, last_error = '' WHERE id = ?")
                    .bind(body.action === 'pause' ? 'paused' : 'active', body.action === 'pause' ? 'paused' : 'active', sub.id).run();
                return json({ ok: true, success: true });
            }
            return fail('BAD_REQUEST', 'פעולה לא מוכרת', { field: 'action' });
        }
    }
    return fail('NOT_FOUND');
}

function sendConfirm(env, { email, systemName, confirmToken, ownerName }) {
    const mail = notifyConfirmMail({ systemName, ownerName, confirmUrl: `${SITE}/sms/n/confirm/${confirmToken}` });
    return sendMail(env, { to: email, ...mail, fromName: 'S.M.T התראות' });
}

// ------------------------------------------
//  קישורים מהמייל: /sms/n/confirm/<token>, /sms/n/unsub/<token>
// ------------------------------------------
export async function handleNotifyLinks(request, env, path) {
    await ensureSchema(env);
    const m = path.match(/^\/sms\/n\/(confirm|unsub)\/([a-f0-9]{32})$/);
    if (!m) return null;
    const [, kind, token] = m;

    if (kind === 'confirm') {
        const sub = await env.DB.prepare('SELECT id, status FROM sms_notify WHERE confirm_token = ?').bind(token).first();
        if (!sub) return html(resultPage('הקישור אינו תקף', 'ייתכן שההרשמה נמחקה. אפשר להירשם מחדש בפורטל.', false), 404);
        if (sub.status === 'pending') {
            // last_seen = NULL: הבדיקה הראשונה רק מסמנת את המצב הקיים, ומשם נשלחות רק הודעות חדשות
            await env.DB.prepare("UPDATE sms_notify SET status = 'active', confirmed_at = ?, last_seen = NULL WHERE id = ?").bind(Date.now(), sub.id).run();
        }
        return html(resultPage('ההתראות אושרו', 'מעכשיו יישלח אליך מייל על כל הודעת SMS חדשה שמגיעה למערכת.'));
    }

    // unsub - גם GET (לחיצה) וגם POST (ביטול בלחיצה אחת מתוך תוכנת המייל)
    const sub = await env.DB.prepare('SELECT id FROM sms_notify WHERE unsub_token = ?').bind(token).first();
    if (sub) await env.DB.prepare("UPDATE sms_notify SET status = 'paused' WHERE id = ?").bind(sub.id).run();
    if (request.method === 'POST') return new Response(null, { status: 204 });
    return html(resultPage('ההתראות הופסקו', 'לא יישלחו יותר מיילים על הודעות SMS. אפשר לחדש אותן בכל עת מהפורטל.'));
}

// ------------------------------------------
//  בדיקה מתוזמנת (cron)
// ------------------------------------------
const rowKey = (r) => {
    // טביעת אצבע קצרה להודעה (FNV-1a), כדי לזהות הודעות שהגיעו באותה שנייה
    const str = `${r.source}|${r.receive_date}|${r.message}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
};

export async function runNotifications(env) {
    await ensureSchema(env);
    const { results: subs } = await env.DB.prepare(`
        SELECT n.*, s.token AS real_token, s.description AS system_desc
        FROM sms_notify n
        JOIN system_tokens s ON n.system_id = s.id
        JOIN access_codes a ON n.code_id = a.id
        WHERE n.status = 'active' AND a.is_blocked != 1`).all();
    if (!subs.length) return { checked: 0, sent: 0 };

    // קריאה אחת לימות המשיח לכל מערכת, גם אם יש כמה נרשמים
    const bySystem = new Map();
    for (const sub of subs) {
        if (!bySystem.has(sub.system_id)) bySystem.set(sub.system_id, { token: sub.real_token, subs: [] });
        bySystem.get(sub.system_id).subs.push(sub);
    }

    let sentTotal = 0;
    for (const { token, subs: list } of bySystem.values()) {
        const res = await callYm('GetIncomingSms', token, { limit: 100 });
        if (res.error) {
            const err = await res.error.json().catch(() => ({}));
            for (const sub of list) {
                await env.DB.prepare('UPDATE sms_notify SET last_checked_at = ?, last_error = ? WHERE id = ?')
                    .bind(Date.now(), String(err.error || 'שגיאה מול ימות המשיח').slice(0, 300), sub.id).run();
            }
            continue;
        }
        const rows = (res.data.rows || []).filter((r) => r && r.receive_date);
        const maxDate = rows.reduce((m, r) => (String(r.receive_date) > m ? String(r.receive_date) : m), '');
        const keysAtMax = rows.filter((r) => String(r.receive_date) === maxDate).map(rowKey);

        for (const sub of list) {
            let fresh = [];
            if (sub.last_seen) {
                const seenKeys = new Set(JSON.parse(sub.last_keys || '[]'));
                fresh = rows
                    .filter((r) => String(r.receive_date) > sub.last_seen || (String(r.receive_date) === sub.last_seen && !seenKeys.has(rowKey(r))))
                    .sort((a, b) => (String(a.receive_date) < String(b.receive_date) ? -1 : 1));
            }

            let error = '';
            if (fresh.length) {
                const unsubUrl = `${SITE}/sms/n/unsub/${sub.unsub_token}`;
                const groups = fresh.length <= MAX_SINGLE_MAILS ? fresh.map((r) => [r]) : [fresh];
                for (const messages of groups) {
                    const mail = smsNotifyMail({ systemName: sub.system_desc, messages, openUrl: `${SITE}/sms/`, unsubUrl });
                    const sent = await sendMail(env, { to: sub.email, ...mail, fromName: 'S.M.T התראות' });
                    if (sent.ok) sentTotal++; else error = sent.error;
                }
            }

            // מתקדמים לסימון החדש (גם אם המייל נכשל - כדי לא להציף בשליחות חוזרות)
            const newSeen = maxDate && (!sub.last_seen || maxDate >= sub.last_seen) ? maxDate : sub.last_seen;
            const newKeys = newSeen === maxDate
                ? (newSeen === sub.last_seen ? [...new Set([...JSON.parse(sub.last_keys || '[]'), ...keysAtMax])] : keysAtMax)
                : JSON.parse(sub.last_keys || '[]');
            await env.DB.prepare(`UPDATE sms_notify SET last_seen = ?, last_keys = ?, last_checked_at = ?, last_error = ?,
                    sent_count = sent_count + ?, last_sent_at = CASE WHEN ? > 0 THEN ? ELSE last_sent_at END WHERE id = ?`)
                .bind(newSeen || '0', JSON.stringify(newKeys.slice(-200)), Date.now(), error.slice(0, 300),
                      fresh.length, fresh.length, Date.now(), sub.id).run();
        }
    }
    return { checked: subs.length, sent: sentTotal };
}
