// ==========================================
//  שליחת מיילים דרך Resend
// ==========================================
// המפתח נלקח מהמסד המשותף yemot-pay (טבלה ms_settings, המפתח resend_api_key) -
// אותו מפתח שמסכת של שבת משתמשת בו, ונערך בדף הניהול שלה. כך אין העתק נוסף של הסוד.
// אם מוגדר משתנה סביבה RESEND_API_KEY - הוא גובר.
// התבנית בנויה מטבלאות וסגנונות פנימיים כדי שתיראה אותו דבר ב-Gmail, Outlook ובטלפון.

import { isPermanent } from './http.js';

const FROM_ADDRESS = 'sms@smti.uk';
const FROM_NAME = 'S.M.T';
const LOGO = 'https://smt-tel-manager.netlify.app/smt.png';

let keyCache = null;

export async function getMailKey(env) {
    if (env.RESEND_API_KEY) return env.RESEND_API_KEY;
    if (keyCache && keyCache.at > Date.now() - 60000) return keyCache.key;
    let key = '';
    if (env.MAIL_DB) {
        const row = await env.MAIL_DB.prepare("SELECT value FROM ms_settings WHERE key = 'resend_api_key'").first();
        key = row && row.value ? String(row.value).trim() : '';
    }
    keyCache = { key, at: Date.now() };
    return key;
}

export const validEmail = (e) => /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(String(e || ''));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FONT = `system-ui,-apple-system,'Segoe UI',Arial,sans-serif`;
const C = {
    bg: '#eef2f7', card: '#ffffff', border: '#e2e8f0', text: '#0f172a', body: '#334155', muted: '#64748b',
    primary: '#2563eb', dark: '#0f172a', soft: '#eff6ff', green: '#059669', greenSoft: '#d1fae5', red: '#dc2626', redSoft: '#fee2e2',
};

// ------------------------------------------
//  תבנית מייל: גישה עם קוד זמני
// ------------------------------------------
export function tempCodeMail({ code, link, clickUrl, pixelUrl, recipientName, senderName, message, phones, permissions, expiresAt }) {
    const href = clickUrl || link; // הקישור בכפתור עובר דרך מונה הלחיצות
    const fmtDate = (ms) => new Date(ms).toLocaleString('he-IL', {
        timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const expiryText = isPermanent(expiresAt) ? 'ללא הגבלת זמן' : `עד ${fmtDate(expiresAt)}`;
    const scopeText = phones.length ? phones.join(', ') : 'כל ההודעות במערכת';
    const permList = [
        permissions.incoming ? ['צפייה בהודעות נכנסות', true] : null,
        permissions.outgoing ? ['צפייה בהודעות יוצאות', true] : null,
        permissions.send ? ['שליחת הודעות', true] : ['שליחת הודעות', false],
    ].filter(Boolean);

    const greeting = recipientName ? `שלום ${recipientName},` : 'שלום,';
    const intro = `${senderName ? senderName + ' שיתף/ה' : 'שותפה'} איתך גישה לצפייה בהודעות SMS. לחיצה על הכפתור תכניס אותך ישירות, בלי צורך להקליד קוד.`;
    const subject = recipientName ? `${recipientName}, קיבלת גישה להודעות SMS` : 'קיבלת גישה להודעות SMS';

    const chip = ([label, on]) => `<span style="display:inline-block;margin:0 0 6px 6px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:700;
        background:${on ? C.greenSoft : '#f1f5f9'};color:${on ? C.green : C.muted};${on ? '' : 'text-decoration:line-through;'}">${on ? '✓' : '✕'} ${esc(label)}</span>`;

    const detailRow = (k, v, ltr) => `<tr>
        <td style="padding:12px 16px;font-size:14px;color:${C.muted};white-space:nowrap;width:1%;border-bottom:1px solid #dbeafe;vertical-align:top">${esc(k)}</td>
        <td style="padding:12px 16px;font-size:15px;font-weight:700;color:${C.text};border-bottom:1px solid #dbeafe"${ltr ? ' dir="ltr" align="right"' : ''}>${v}</td></tr>`;

    const messageBox = message ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>
          <td style="border-right:4px solid ${C.primary};background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:15px;line-height:1.7;color:${C.body};white-space:pre-line">${esc(message)}</td>
        </tr></table>` : '';

    const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT}" dir="rtl">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">קוד הגישה שלך: ${esc(code)} · ${esc(expiryText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">

    <tr><td style="background:${C.dark};background-image:linear-gradient(135deg,#1e3a8a 0%,#0f172a 70%);border-radius:18px 18px 0 0;padding:26px 30px" bgcolor="${C.dark}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:46px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:46px;height:46px;border-radius:12px;background:#ffffff;text-align:center;vertical-align:middle"><img src="${LOGO}" alt="" width="34" style="width:34px;height:auto;border:0;vertical-align:middle"></td>
        </tr></table></td>
        <td style="padding-right:14px;font-family:${FONT}">
          <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.3px">S.M.T Systems</div>
          <div style="font-size:13px;color:#93c5fd">מערכת הודעות SMS</div></td>
        <td align="left" style="font-size:28px">💬</td>
      </tr></table></td></tr>

    <tr><td style="background:${C.card};border:1px solid ${C.border};border-top:0;padding:32px 30px 26px" dir="rtl">
      <h1 style="margin:0 0 6px;font-size:24px;line-height:1.35;color:${C.text};font-family:${FONT}">קיבלת גישה להודעות</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:${C.body}">${esc(greeting)}<br>${esc(intro)}</p>
      ${messageBox}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr><td align="center"
        style="background:${C.soft};border:2px dashed #93c5fd;border-radius:14px;padding:20px 12px">
        <div style="font-size:13px;color:${C.muted};margin-bottom:6px">קוד הגישה שלך</div>
        <div dir="ltr" style="font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:32px;font-weight:800;letter-spacing:6px;color:${C.dark}">${esc(code)}</div>
      </td></tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px"><tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:12px;background:${C.primary};box-shadow:0 6px 16px rgba(37,99,235,.35)" bgcolor="${C.primary}">
            <a href="${esc(href)}" style="display:inline-block;padding:15px 42px;font-size:17px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;font-family:${FONT}">כניסה ישירה להודעות ←</a>
          </td></tr></table>
      </td></tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:${C.soft};border:1px solid #dbeafe;border-radius:12px;border-collapse:separate;overflow:hidden">
        ${detailRow('הודעות של', esc(scopeText), phones.length > 0)}
        ${detailRow('תוקף', esc(expiryText))}
        <tr><td style="padding:12px 16px;font-size:14px;color:${C.muted};white-space:nowrap;width:1%;vertical-align:top">הרשאות</td>
            <td style="padding:10px 16px 6px">${permList.map(chip).join('')}</td></tr>
      </table>

      <div style="margin-top:18px;padding:12px 16px;border-radius:10px;background:#f8fafc;border:1px solid ${C.border};font-size:13px;color:${C.muted};line-height:1.7">
        הכפתור לא עובד? העתיקו לדפדפן את הכתובת:<br>
        <a href="${esc(href)}" dir="ltr" style="color:${C.primary};word-break:break-all">${esc(link)}</a><br>
        הקוד אישי - אל תעבירו אותו לאחרים.
      </div>
    </td></tr>

    <tr><td style="background:#f8fafc;border:1px solid ${C.border};border-top:0;border-radius:0 0 18px 18px;padding:14px 30px;text-align:center;font-size:12px;color:${C.muted}">
      נשלח ממערכת S.M.T · smti.uk</td></tr>
  </table>
</td></tr></table>${pixelUrl ? `<img src="${esc(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0">` : ''}</body></html>`;

    const text = [
        'קיבלת גישה להודעות', greeting, intro, message || '',
        `קוד הגישה: ${code}`, `כניסה ישירה: ${href}`,
        `הודעות של: ${scopeText}`, `תוקף: ${expiryText}`,
        `הרשאות: ${permList.filter(([, on]) => on).map(([l]) => l).join(', ')}`,
    ].filter(Boolean).join('\n\n');

    return { subject, html, text };
}

// ------------------------------------------
//  שליחה
// ------------------------------------------
// מחזיר { ok: true, id } או { ok: false, status, error }
export async function sendMail(env, { to, subject, html, text, fromName, headers }) {
    const key = await getMailKey(env);
    if (!key) return { ok: false, status: 409, error: 'מפתח המייל (Resend) לא מוגדר' };
    const name = String(fromName || FROM_NAME).replace(/["<>\r\n]/g, '').slice(0, 60);
    let res;
    try {
        res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: `${name} <${FROM_ADDRESS}>`, to: [to], subject, html, text, ...(headers ? { headers } : {}) }),
        });
    } catch (e) {
        return { ok: false, status: 502, error: 'אין תקשורת עם שרת המייל' };
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok) {
        console.error('[mail]', res.status, data.message);
        return { ok: false, status: 502, error: `שליחת המייל נכשלה${data.message ? ': ' + data.message : ''}` };
    }
    return { ok: true, id: data.id };
}

// ------------------------------------------
//  מעטפת משותפת למיילים הקצרים (אישור הרשמה / התראת SMS)
// ------------------------------------------
function shell({ title, preheader, inner, footer }) {
    return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT}" dir="rtl">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td style="background:${C.dark};background-image:linear-gradient(135deg,#1e3a8a 0%,#0f172a 70%);border-radius:18px 18px 0 0;padding:22px 30px" bgcolor="${C.dark}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:42px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:42px;height:42px;border-radius:11px;background:#ffffff;text-align:center;vertical-align:middle"><img src="${LOGO}" alt="" width="31" style="width:31px;height:auto;border:0;vertical-align:middle"></td>
        </tr></table></td>
        <td style="padding-right:14px;font-family:${FONT}">
          <div style="font-size:19px;font-weight:800;color:#ffffff">S.M.T Systems</div>
          <div style="font-size:13px;color:#93c5fd">מערכת הודעות SMS</div></td>
      </tr></table></td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.border};border-top:0;padding:30px" dir="rtl">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:${C.text};font-family:${FONT}">${esc(title)}</h1>
      ${inner}
    </td></tr>
    <tr><td style="background:#f8fafc;border:1px solid ${C.border};border-top:0;border-radius:0 0 18px 18px;padding:14px 30px;text-align:center;font-size:12px;color:${C.muted};line-height:1.8">
      ${footer || 'נשלח ממערכת S.M.T · smti.uk'}</td></tr>
  </table>
</td></tr></table></body></html>`;
}

const button = (url, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr>
    <td style="border-radius:12px;background:${C.primary}" bgcolor="${C.primary}">
    <a href="${esc(url)}" style="display:inline-block;padding:13px 34px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;font-family:${FONT}">${esc(label)}</a></td></tr></table>`;

const fmtSmsDate = (d) => {
    const t = new Date(String(d || '').replace(' ', 'T'));
    return isNaN(t) ? String(d || '') : t.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// מייל אישור הרשמה להתראות
export function notifyConfirmMail({ systemName, confirmUrl, ownerName }) {
    const subject = 'אישור קבלת התראות על הודעות SMS';
    const inner = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${C.body}">שלום${ownerName ? ' ' + esc(ownerName) : ''},<br>
      ביקשת לקבל מייל על כל הודעת SMS שמגיעה למערכת <b>${esc(systemName)}</b>.<br>
      כדי להתחיל לקבל את ההתראות, יש לאשר את כתובת המייל:</p>
      ${button(confirmUrl, 'אישור קבלת התראות ✓')}
      <div style="padding:12px 16px;border-radius:10px;background:#f8fafc;border:1px solid ${C.border};font-size:13px;color:${C.muted};line-height:1.7">
        לא ביקשת את זה? אפשר להתעלם מהמייל, ולא יישלחו התראות.</div>`;
    return {
        subject,
        html: shell({ title: 'אישור קבלת התראות', preheader: `התראות על SMS למערכת ${systemName}`, inner }),
        text: `${subject}\n\nביקשת לקבל מייל על כל הודעת SMS שמגיעה למערכת ${systemName}.\nלאישור: ${confirmUrl}\n\nלא ביקשת? אפשר להתעלם מהמייל.`,
    };
}

// מייל התראה על SMS נכנס (הודעה אחת או כמה)
export function smsNotifyMail({ systemName, messages, openUrl, unsubUrl }) {
    const many = messages.length > 1;
    const first = messages[0];
    const subject = many
        ? `${messages.length} הודעות SMS חדשות · ${systemName}`
        : `SMS חדש מ-${first.source} · ${systemName}`;
    const card = (m) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:${C.soft};border:1px solid #dbeafe;border-radius:12px"><tr><td style="padding:14px 18px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td dir="ltr" align="right" style="font-family:'SFMono-Regular',Consolas,monospace;font-size:15px;font-weight:800;color:${C.dark}">${esc(m.source)}</td>
          <td align="left" style="font-size:12px;color:${C.muted};white-space:nowrap">${esc(fmtSmsDate(m.receive_date))}</td>
        </tr></table>
        <div style="margin-top:8px;font-size:16px;line-height:1.7;color:${C.text};white-space:pre-line;word-break:break-word">${esc(m.message)}</div>
      </td></tr></table>`;
    const inner = `
      <p style="margin:0 0 16px;font-size:15px;color:${C.muted}">מערכת: <b style="color:${C.text}">${esc(systemName)}</b></p>
      ${messages.map(card).join('')}
      ${button(openUrl, 'פתיחה במערכת ההודעות')}`;
    const footer = `קיבלת מייל זה כי אישרת התראות על הודעות SMS · <a href="${esc(unsubUrl)}" style="color:${C.muted}">הפסקת ההתראות</a>`;
    return {
        subject,
        html: shell({ title: many ? `${messages.length} הודעות חדשות` : 'הודעה חדשה', preheader: `${first.source}: ${String(first.message || '').slice(0, 90)}`, inner, footer }),
        text: messages.map((m) => `${m.source} · ${fmtSmsDate(m.receive_date)}\n${m.message}`).join('\n\n---\n\n') + `\n\nפתיחה: ${openUrl}\nהפסקת ההתראות: ${unsubUrl}`,
        headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    };
}

// דף תוצאה קטן (אישור / ביטול הרשמה)
export function resultPage(title, text, ok = true) {
    return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${C.bg};font-family:${FONT};padding:16px;box-sizing:border-box">
<div style="max-width:420px;width:100%;background:#fff;border:1px solid ${C.border};border-radius:18px;padding:34px 28px;text-align:center;box-shadow:0 10px 30px rgba(15,23,42,.08)">
  <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:${ok ? C.greenSoft : C.redSoft};color:${ok ? C.green : C.red};font-size:32px;line-height:64px;font-weight:800">${ok ? '✓' : '!'}</div>
  <h1 style="margin:0 0 10px;font-size:22px;color:${C.text}">${esc(title)}</h1>
  <p style="margin:0;font-size:15px;line-height:1.7;color:${C.body}">${esc(text)}</p>
</div></body></html>`;
}
