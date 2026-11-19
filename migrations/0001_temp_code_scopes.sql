-- הרחבת הקודים הזמניים: הגבלה למספרים והרשאות מפורטות.
-- ה-Worker מריץ את זה אוטומטית (schema.js). הקובץ כאן לתיעוד / הרצה ידנית:
--   npx wrangler d1 execute sms-db --remote --file=migrations/0001_temp_code_scopes.sql
ALTER TABLE temp_codes ADD COLUMN allowed_phones TEXT NOT NULL DEFAULT '';
ALTER TABLE temp_codes ADD COLUMN allow_incoming INTEGER NOT NULL DEFAULT 1;
ALTER TABLE temp_codes ADD COLUMN allow_outgoing INTEGER NOT NULL DEFAULT 1;
ALTER TABLE temp_codes ADD COLUMN allow_send INTEGER NOT NULL DEFAULT 1;
ALTER TABLE temp_codes ADD COLUMN label TEXT NOT NULL DEFAULT '';
