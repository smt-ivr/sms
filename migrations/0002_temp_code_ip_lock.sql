-- הגבלת IP לקודים זמניים. ה-Worker מריץ את זה אוטומטית (schema.js).
--   npx wrangler d1 execute sms-db --remote --file=migrations/0002_temp_code_ip_lock.sql
ALTER TABLE temp_codes ADD COLUMN allowed_ips TEXT NOT NULL DEFAULT '';
ALTER TABLE temp_codes ADD COLUMN lock_first_ip INTEGER NOT NULL DEFAULT 0;
