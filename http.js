// ==========================================
//  כלי תגובה אחידים לכל ה-API של האתר
// ==========================================
// כל תגובת JSON יוצאת עם Content-Type נכון.
// כל שגיאה מחזירה מבנה קבוע:
//   { ok: false, code: 'ERROR_CODE', error: 'הודעה בעברית' }
// והסטטוס של HTTP תואם לסוג השגיאה.

export const ERRORS = {
    // --- בקשה ---
    BAD_REQUEST:          { status: 400, message: 'בקשה לא תקינה' },
    NOT_FOUND:            { status: 404, message: 'נתיב לא קיים' },
    METHOD_NOT_ALLOWED:   { status: 405, message: 'שיטת בקשה לא נתמכת' },

    // --- קוד זמני ---
    MISSING_TEMP_CODE:    { status: 401, message: 'חסר קוד זמני' },
    INVALID_TEMP_CODE:    { status: 401, message: 'קוד זמני שגוי' },
    TEMP_CODE_DISABLED:   { status: 403, message: 'הקוד הזמני מושבת' },
    TEMP_CODE_EXPIRED:    { status: 403, message: 'הקוד הזמני פג תוקף' },
    OWNER_BLOCKED:        { status: 403, message: 'בעל הקוד חסום במערכת' },

    // --- הרשאות ---
    ACTION_NOT_ALLOWED:   { status: 403, message: 'פעולה זו אינה זמינה דרך קוד זמני' },
    PERMISSION_DENIED:    { status: 403, message: 'אין לקוד זה הרשאה לפעולה המבוקשת' },
    PHONE_NOT_ALLOWED:    { status: 403, message: 'הקוד אינו מורשה למספר זה' },
    IP_NOT_ALLOWED:       { status: 403, message: 'הקוד אינו מורשה לשימוש מכתובת IP זו' },

    // --- מול ימות המשיח ---
    UPSTREAM_REJECTED:    { status: 502, message: 'ימות המשיח דחו את הבקשה' },
    UPSTREAM_BAD_RESPONSE:{ status: 502, message: 'תשובה לא תקינה מימות המשיח' },
    UPSTREAM_UNREACHABLE: { status: 502, message: 'שגיאת תקשורת מול ימות המשיח' },
    UPSTREAM_TIMEOUT:     { status: 504, message: 'ימות המשיח לא הגיבו בזמן' },

    // --- מייל ---
    MAIL_NOT_CONFIGURED:  { status: 409, message: 'שליחת מיילים לא הוגדרה' },
    MAIL_FAILED:          { status: 502, message: 'שליחת המייל נכשלה' },

    // --- כללי ---
    INTERNAL_ERROR:       { status: 500, message: 'שגיאת שרת פנימית' },
};

const JSON_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
};

// תחליף ישיר ל- new Response(JSON.stringify(data), init)
export function json(data, init = {}) {
    const headers = { ...JSON_HEADERS, ...(init.headers || {}) };
    return new Response(JSON.stringify(data), { ...init, headers });
}

export function ok(data = {}, status = 200) {
    return json({ ok: true, ...data }, { status });
}

// fail('PHONE_NOT_ALLOWED') או fail('BAD_REQUEST', 'הודעה מותאמת', { field: 'phones' })
export function fail(code, message, extra = {}) {
    const def = ERRORS[code] || ERRORS.INTERNAL_ERROR;
    return json(
        { ok: false, code: ERRORS[code] ? code : 'INTERNAL_ERROR', error: message || def.message, ...extra },
        { status: def.status }
    );
}

// נרמול מספר טלפון ישראלי לפורמט 05XXXXXXXX (ספרות בלבד)
export function normalizePhone(phone) {
    if (phone === null || phone === undefined) return '';
    let cleaned = String(phone).replace(/[^\d]/g, '');
    if (cleaned.startsWith('972')) cleaned = '0' + cleaned.substring(3);
    return cleaned;
}

// מזהה שולח להשוואה: מספר -> 05XXXXXXXX, שם (GOVil) -> אותיות קטנות
export function isPhoneLike(value) {
    const t = String(value ?? '').trim();
    return /\d/.test(t) && /^[\d+\-\s().]+$/.test(t);
}
export function senderKey(value) {
    const t = String(value ?? '').trim();
    return isPhoneLike(t) ? normalizePhone(t) : t.toLowerCase();
}

// ==========================================
//  תוקף
// ==========================================
// "לצמיתות" נשמר כתאריך רחוק (שנת 9999) - כך כל השוואות התוקף הקיימות ממשיכות לעבוד
export const PERMANENT_EXPIRY = 253402300799000;
export const isPermanent = (expiresAt) => Number(expiresAt) >= PERMANENT_EXPIRY;

// ==========================================
//  הגבלת IP (כתובת בודדת או טווח CIDR, IPv4 ו-IPv6)
// ==========================================
function ipToBig(ip) {
    ip = String(ip || '').trim();
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) ip = mapped[1];

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        const parts = ip.split('.').map(Number);
        if (parts.some((p) => p > 255)) return null;
        return { v: 4, n: parts.reduce((acc, p) => (acc << 8n) + BigInt(p), 0n) };
    }

    if (!ip.includes(':') || !/^[0-9a-f:]+$/i.test(ip)) return null;
    const halves = ip.split('::');
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(':') : [];
    const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = 8 - head.length - tail.length;
    if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
    const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
    if (groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
    return { v: 6, n: groups.reduce((acc, g) => (acc << 16n) + BigInt(parseInt(g, 16)), 0n) };
}

// "1.2.3.4" / "1.2.3.0/24" / "2001:db8::/32" -> אובייקט כלל, או null אם לא תקין
export function parseIpRule(rule) {
    const parts = String(rule || '').trim().split('/');
    if (parts.length > 2) return null;
    const ip = ipToBig(parts[0]);
    if (!ip) return null;
    const bits = ip.v === 4 ? 32 : 128;
    if (parts.length === 2 && !/^\d{1,3}$/.test(parts[1])) return null;
    const prefix = parts.length === 2 ? Number(parts[1]) : bits;
    if (prefix < 0 || prefix > bits) return null;
    return { ...ip, prefix, bits };
}

export function splitList(str) {
    return String(str || '').split(/[,;\s\n]+/).map((s) => s.trim()).filter(Boolean);
}

// רשימה ריקה = הכל מותר
export function ipAllowed(ip, rulesStr) {
    const rules = splitList(rulesStr);
    if (rules.length === 0) return true;
    const addr = ipToBig(ip);
    if (!addr) return false;
    return rules.some((r) => {
        const rule = parseIpRule(r);
        if (!rule || rule.v !== addr.v) return false;
        const shift = BigInt(rule.bits - rule.prefix);
        return (addr.n >> shift) === (rule.n >> shift);
    });
}

// מזהה אקראי של 32 תווים הקסדצימליים (לקישורי מעקב / אישור)
export function randomToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
