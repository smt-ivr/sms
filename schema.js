// ==========================================
//  מיגרציה אוטומטית לטבלת temp_codes
// ==========================================
// מוסיף את העמודות החדשות אם הן עדיין לא קיימות.
// רץ פעם אחת לכל מופע של ה-Worker (ואז נשמר בזיכרון).
//
//   allowed_phones  - רשימת מספרים מופרדת בפסיקים. ריק = כל המספרים.
//   allow_incoming  - האם מותר לראות הודעות נכנסות
//   allow_outgoing  - האם מותר לראות הודעות יוצאות
//   allow_send      - האם מותר לשלוח הודעות
//   label           - תיאור חופשי לקוד (למי הוא ניתן)

const TEMP_CODE_COLUMNS = [
    ['allowed_phones', "TEXT NOT NULL DEFAULT ''"],
    ['allow_incoming', 'INTEGER NOT NULL DEFAULT 1'],
    ['allow_outgoing', 'INTEGER NOT NULL DEFAULT 1'],
    ['allow_send',     'INTEGER NOT NULL DEFAULT 1'],
    ['label',          "TEXT NOT NULL DEFAULT ''"],
];

let schemaReady = null;

export function ensureSchema(env) {
    if (!schemaReady) {
        schemaReady = migrate(env).catch((e) => {
            schemaReady = null; // ננסה שוב בבקשה הבאה
            throw e;
        });
    }
    return schemaReady;
}

async function migrate(env) {
    const { results } = await env.DB.prepare('PRAGMA table_info(temp_codes)').all();
    const existing = new Set((results || []).map((c) => c.name));
    for (const [name, def] of TEMP_CODE_COLUMNS) {
        if (existing.has(name)) continue;
        try {
            await env.DB.prepare(`ALTER TABLE temp_codes ADD COLUMN ${name} ${def}`).run();
        } catch (e) {
            // מופע אחר כבר הוסיף את העמודה במקביל
            if (!String(e.message).includes('duplicate column')) throw e;
        }
    }
}
