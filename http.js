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

    // --- מול ימות המשיח ---
    UPSTREAM_REJECTED:    { status: 502, message: 'ימות המשיח דחו את הבקשה' },
    UPSTREAM_BAD_RESPONSE:{ status: 502, message: 'תשובה לא תקינה מימות המשיח' },
    UPSTREAM_UNREACHABLE: { status: 502, message: 'שגיאת תקשורת מול ימות המשיח' },
    UPSTREAM_TIMEOUT:     { status: 504, message: 'ימות המשיח לא הגיבו בזמן' },

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
