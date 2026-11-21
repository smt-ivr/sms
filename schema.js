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
//   allowed_ips     - כתובות / טווחי CIDR מותרים, מופרדים בפסיקים. ריק = מכל מקום.
//   lock_first_ip   - נעילה אוטומטית לכתובת ה-IP של הכניסה הראשונה

const TEMP_CODE_COLUMNS = [
    ['allowed_phones', "TEXT NOT NULL DEFAULT ''"],
    ['allow_incoming', 'INTEGER NOT NULL DEFAULT 1'],
    ['allow_outgoing', 'INTEGER NOT NULL DEFAULT 1'],
    ['allow_send',     'INTEGER NOT NULL DEFAULT 1'],
    ['label',          "TEXT NOT NULL DEFAULT ''"],
    ['allowed_ips',    "TEXT NOT NULL DEFAULT ''"],
    ['lock_first_ip',  'INTEGER NOT NULL DEFAULT 0'],
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

// טבלאות חדשות
//   mail_log    - מיילים שנשלחו עם קוד זמני: מתי נפתחו ומתי לחצו על הקישור
//   sms_notify  - הרשמות לקבלת מייל על כל SMS נכנס (דורשות אישור מהמייל)
const TABLES = [
    `CREATE TABLE IF NOT EXISTS mail_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_id INTEGER NOT NULL,
        temp_code_id INTEGER NOT NULL,
        to_email TEXT NOT NULL,
        sent_code TEXT NOT NULL DEFAULT '',
        recipient_name TEXT NOT NULL DEFAULT '',
        token TEXT NOT NULL UNIQUE,
        resend_id TEXT NOT NULL DEFAULT '',
        sent_at INTEGER NOT NULL,
        opened_at INTEGER,
        last_opened_at INTEGER,
        open_count INTEGER NOT NULL DEFAULT 0,
        clicked_at INTEGER,
        last_clicked_at INTEGER,
        click_count INTEGER NOT NULL DEFAULT 0
    )`,
    'CREATE INDEX IF NOT EXISTS idx_mail_log_temp ON mail_log(temp_code_id)',
    `CREATE TABLE IF NOT EXISTS sms_notify (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_id INTEGER NOT NULL,
        system_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        confirm_token TEXT NOT NULL UNIQUE,
        unsub_token TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        confirmed_at INTEGER,
        last_seen TEXT,
        last_keys TEXT NOT NULL DEFAULT '[]',
        last_checked_at INTEGER,
        last_sent_at INTEGER,
        sent_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT NOT NULL DEFAULT ''
    )`,
    'CREATE INDEX IF NOT EXISTS idx_sms_notify_status ON sms_notify(status)',
];

async function migrate(env) {
    for (const sql of TABLES) await env.DB.prepare(sql).run();

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
