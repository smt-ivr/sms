// ==========================================
//  Proxy לקודים זמניים מול ימות המשיח
// ==========================================
// הטוקן האמיתי לא נחשף לעולם. הפרוקסי מעביר רק פעולות מוגדרות מראש,
// בודק הרשאות לכל קוד, ומסנן הודעות לפי המספרים שהקוד מורשה אליהם.
//
// נתיבים (תחת /sms/api/proxy/ או /api/proxy/), עם כותרת x-temp-code:
//   GET  info            - פרטי הקוד: תוקף, מערכת, מספרים מורשים, הרשאות
//   GET  GetIncomingSms  - הודעות נכנסות (מסונן)          ?limit=
//   GET  GetSmsOutLog    - הודעות יוצאות (מסונן)          ?limit=
//   GET/POST SendSms     - שליחת הודעה                    phones=, message=
//
// תגובת הצלחה: { ok: true, responseStatus: 'OK', ... }
// תגובת שגיאה: { ok: false, code: 'ERROR_CODE', error: '...' }  (ראו http.js)

import { ok, fail, normalizePhone, senderKey, isPermanent, ipAllowed } from './http.js';
import { callYm } from './ym.js';
import { ensureSchema } from './schema.js';

const DEFAULT_LIMIT = 3000;
const MAX_LIMIT = 5000;
const MAX_MESSAGE_LENGTH = 1000;

const ACTIONS = {
    GetIncomingSms: { permission: 'allow_incoming', handler: getIncoming },
    GetSmsOutLog:   { permission: 'allow_outgoing', handler: getOutgoing },
    SendSms:        { permission: 'allow_send',     handler: sendSms },
};

export default async function handleProxyApi(request, env) {
    try {
        if (request.method !== 'GET' && request.method !== 'POST') {
            return fail('METHOD_NOT_ALLOWED');
        }

        const url = new URL(request.url);
        const action = url.pathname.replace(/^(\/sms)?\/api\/proxy\/?/, '').replace(/\/+$/, '');
        if (!action) return fail('NOT_FOUND', 'יש לציין פעולה בנתיב');
        if (action !== 'info' && !ACTIONS[action]) {
            return fail('ACTION_NOT_ALLOWED', `הפעולה "${action}" אינה זמינה דרך קוד זמני`, {
                allowedActions: ['info', ...Object.keys(ACTIONS)],
            });
        }

        await ensureSchema(env);

        // --- אימות הקוד הזמני ---
        const auth = await loadTempCode(request, env);
        if (auth.error) return auth.error;
        const ctx = auth.ctx;

        if (action === 'info') return ok({ responseStatus: 'OK', tempCode: describe(ctx) });

        const def = ACTIONS[action];
        if (!ctx.record[def.permission]) {
            return fail('PERMISSION_DENIED', permissionMessage(def.permission));
        }

        const params = await readParams(request, url);

        // תיעוד הפעולה
        const ip = ctx.ip || 'unknown';
        await env.DB.prepare('INSERT INTO temp_access_logs (temp_code_id, ip_address, endpoint, timestamp) VALUES (?, ?, ?, ?)')
            .bind(ctx.record.id, ip, action, Date.now()).run();

        return await def.handler(ctx, params);
    } catch (e) {
        console.error('Proxy Error:', e);
        return fail('INTERNAL_ERROR');
    }
}

// ------------------------------------------
//  אימות
// ------------------------------------------
async function loadTempCode(request, env) {
    const tempCode = (request.headers.get('x-temp-code') || '').trim();
    if (!tempCode) return { error: fail('MISSING_TEMP_CODE') };

    // אותו קוד יכול להופיע שוב אחרי שפג תוקפו - תמיד לוקחים את העדכני ביותר
    const record = await env.DB.prepare(`
        SELECT t.*, s.token AS real_token, s.description AS system_desc,
               a.is_blocked AS owner_blocked, a.allow_temp_codes AS owner_allow_temp
        FROM temp_codes t
        JOIN system_tokens s ON t.system_id = s.id
        JOIN access_codes a ON t.code_id = a.id
        WHERE UPPER(t.temp_code) = UPPER(?)
        ORDER BY t.is_active DESC, t.expires_at DESC
        LIMIT 1
    `).bind(tempCode).first();

    if (!record) return { error: fail('INVALID_TEMP_CODE') };
    if (record.owner_blocked === 1) return { error: fail('OWNER_BLOCKED') };
    if (!record.owner_allow_temp) return { error: fail('TEMP_CODE_DISABLED', 'הרשאת הקודים הזמניים של בעל הקוד בוטלה') };
    if (record.is_active !== 1) return { error: fail('TEMP_CODE_DISABLED') };
    if (Date.now() > record.expires_at) return { error: fail('TEMP_CODE_EXPIRED', undefined, { expiredAt: record.expires_at }) };

    // --- הגבלת IP ---
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (record.lock_first_ip && !record.allowed_ips && ip) {
        // כניסה ראשונה - נועלים את הקוד לכתובת הזו (רק אם אף בקשה מקבילה לא הקדימה)
        await env.DB.prepare("UPDATE temp_codes SET allowed_ips = ? WHERE id = ? AND allowed_ips = ''").bind(ip, record.id).run();
        const fresh = await env.DB.prepare('SELECT allowed_ips FROM temp_codes WHERE id = ?').bind(record.id).first();
        record.allowed_ips = fresh ? fresh.allowed_ips : ip;
    }
    if (!ipAllowed(ip, record.allowed_ips)) return { error: fail('IP_NOT_ALLOWED') };

    // מספרים ושמות שולחים (למשל GOVil) - ההשוואה לפי senderKey
    const phones = String(record.allowed_phones || '')
        .split(',').map((p) => p.trim()).filter(Boolean);
    const keys = phones.map(senderKey);

    return { ctx: { record, phones, keys, restricted: phones.length > 0, ip } };
}

function describe(ctx) {
    const r = ctx.record;
    return {
        code: r.temp_code,
        label: r.label || '',
        system: r.system_desc,
        permanent: isPermanent(r.expires_at),
        expiresAt: isPermanent(r.expires_at) ? null : r.expires_at,
        remainingSeconds: isPermanent(r.expires_at) ? null : Math.max(0, Math.floor((r.expires_at - Date.now()) / 1000)),
        ipRestricted: !!r.allowed_ips,
        restricted: ctx.restricted,
        phones: ctx.phones,
        permissions: {
            incoming: !!r.allow_incoming,
            outgoing: !!r.allow_outgoing,
            send: !!r.allow_send,
        },
    };
}

function permissionMessage(permission) {
    return {
        allow_incoming: 'לקוד זה אין הרשאה לצפות בהודעות נכנסות',
        allow_outgoing: 'לקוד זה אין הרשאה לצפות בהודעות יוצאות',
        allow_send: 'לקוד זה אין הרשאה לשלוח הודעות',
    }[permission];
}

async function readParams(request, url) {
    const params = Object.fromEntries(url.searchParams);
    if (request.method === 'POST') {
        const type = request.headers.get('Content-Type') || '';
        try {
            if (type.includes('application/json')) Object.assign(params, await request.json());
            else if (type.includes('form')) Object.assign(params, Object.fromEntries(await request.formData()));
        } catch (e) { /* גוף ריק או לא תקין - נשארים עם פרמטרי ה-URL */ }
    }
    delete params.token; // לעולם לא מאפשרים להחליף את הטוקן
    return params;
}

function parseLimit(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
    return Math.min(n, MAX_LIMIT);
}

// ------------------------------------------
//  פעולות
// ------------------------------------------
async function getIncoming(ctx, params) {
    const res = await callYm('GetIncomingSms', ctx.record.real_token, { limit: parseLimit(params.limit) });
    if (res.error) return res.error;
    const rows = filterRows(ctx, res.data.rows, (row) => row.source ?? row.phone ?? row.from);
    return ok({ responseStatus: 'OK', action: 'GetIncomingSms', restricted: ctx.restricted, count: rows.length, rows });
}

async function getOutgoing(ctx, params) {
    const res = await callYm('GetSmsOutLog', ctx.record.real_token, { limit: parseLimit(params.limit) });
    if (res.error) return res.error;
    const rows = filterRows(ctx, res.data.rows, (row) => row.To ?? row.to ?? row.phone);
    return ok({ responseStatus: 'OK', action: 'GetSmsOutLog', restricted: ctx.restricted, count: rows.length, rows });
}

async function sendSms(ctx, params) {
    const message = String(params.message ?? '').trim();
    if (!message) return fail('BAD_REQUEST', 'חסר תוכן הודעה', { field: 'message' });
    if (message.length > MAX_MESSAGE_LENGTH) {
        return fail('BAD_REQUEST', `ההודעה ארוכה מדי (מקסימום ${MAX_MESSAGE_LENGTH} תווים)`, { field: 'message' });
    }

    const rawPhones = String(params.phones ?? '').split(/[,:;\s]+/).filter(Boolean);
    if (rawPhones.length === 0) return fail('BAD_REQUEST', 'חסר מספר נמען', { field: 'phones' });

    const phones = [];
    for (const raw of rawPhones) {
        if (/[a-zA-Zא-ת]/.test(raw)) {
            return fail('BAD_REQUEST', `לא ניתן לשלוח הודעה לשולח בשם (${raw}) - רק למספר טלפון`, { field: 'phones' });
        }
        const phone = normalizePhone(raw);
        if (!/^\d{9,12}$/.test(phone) || /[^\d+\-\s()]/.test(raw)) {
            return fail('BAD_REQUEST', `מספר לא תקין: ${raw}`, { field: 'phones' });
        }
        if (ctx.restricted && !ctx.keys.includes(senderKey(phone))) {
            return fail('PHONE_NOT_ALLOWED', `הקוד אינו מורשה לשלוח למספר ${phone}`, { phone });
        }
        phones.push(phone);
    }

    const res = await callYm('SendSms', ctx.record.real_token, { phones: phones.join(':'), message });
    if (res.error) return res.error;

    const { responseStatus, ...rest } = res.data;
    return ok({ responseStatus: 'OK', action: 'SendSms', phones, ...rest });
}

function filterRows(ctx, rows, getPhone) {
    const list = Array.isArray(rows) ? rows : [];
    if (!ctx.restricted) return list;
    return list.filter((row) => ctx.keys.includes(senderKey(getPhone(row))));
}
