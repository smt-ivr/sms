# sms

## Proxy לקודים זמניים

כל בקשה נשלחת עם הכותרת `x-temp-code: <הקוד>` אל `/sms/api/proxy/<פעולה>`.
הטוקן האמיתי של ימות המשיח לא נחשף. רק הפעולות שבטבלה מועברות, וכל השאר נחסם.

| פעולה | שיטה | פרמטרים | הרשאה נדרשת |
|---|---|---|---|
| `info` | GET | – | – |
| `GetIncomingSms` | GET | `limit` (ברירת מחדל 3000, מקסימום 5000) | צפייה בנכנסות |
| `GetSmsOutLog` | GET | `limit` | צפייה ביוצאות |
| `SendSms` | GET / POST | `phones`, `message` | שליחה |

כשהקוד מוגבל למספרים מסוימים, הפרוקסי מחזיר רק הודעות מהם ואליהם,
ושולח הודעות רק אליהם.

### מבנה תגובה

הצלחה:
```json
{ "ok": true, "responseStatus": "OK", "action": "GetIncomingSms", "restricted": true, "count": 1, "rows": [] }
```

שגיאה:
```json
{ "ok": false, "code": "PHONE_NOT_ALLOWED", "error": "הקוד אינו מורשה לשלוח למספר 0502222222" }
```

### קודי שגיאה

| קוד | HTTP | מתי |
|---|---|---|
| `BAD_REQUEST` | 400 | פרמטר חסר או לא תקין (השדה מצוין ב-`field`) |
| `NOT_FOUND` | 404 | נתיב לא קיים |
| `METHOD_NOT_ALLOWED` | 405 | שיטה שאינה GET/POST |
| `MISSING_TEMP_CODE` | 401 | לא נשלחה כותרת `x-temp-code` |
| `INVALID_TEMP_CODE` | 401 | הקוד לא קיים |
| `TEMP_CODE_DISABLED` | 403 | הקוד הושבת, או שהרשאת הקודים הזמניים של בעליו בוטלה |
| `TEMP_CODE_EXPIRED` | 403 | פג התוקף (מצורף `expiredAt`) |
| `OWNER_BLOCKED` | 403 | בעל הקוד חסום |
| `ACTION_NOT_ALLOWED` | 403 | פעולה שלא ברשימה (מצורף `allowedActions`) |
| `PERMISSION_DENIED` | 403 | לקוד אין הרשאה לפעולה הזו |
| `PHONE_NOT_ALLOWED` | 403 | ניסיון שליחה למספר שאינו מורשה |
| `UPSTREAM_REJECTED` | 502 | ימות המשיח החזירו שגיאה (מצורף `upstreamStatus`) |
| `UPSTREAM_BAD_RESPONSE` | 502 | התשובה מימות המשיח אינה JSON |
| `UPSTREAM_UNREACHABLE` | 502 | אין תקשורת עם ימות המשיח |
| `UPSTREAM_TIMEOUT` | 504 | אין תשובה תוך 15 שניות |
| `INTERNAL_ERROR` | 500 | שגיאת שרת |

### מסד נתונים

לטבלה `temp_codes` נוספו העמודות `allowed_phones`, `allow_incoming`, `allow_outgoing`, `allow_send` ו-`label`.
ה-Worker מוסיף אותן אוטומטית בפעם הראשונה שהוא רץ (`schema.js`).
להרצה ידנית: `migrations/0001_temp_code_scopes.sql`.
