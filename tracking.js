// ==========================================
//  מעקב מיילים: פתיחה ולחיצה על הקישור
// ==========================================
//   /sms/t/o/<token>.gif  - תמונה שקופה בגודל פיקסל. כשהמייל נפתח והתמונות נטענות, נרשמת פתיחה.
//   /sms/t/c/<token>      - הקישור שבכפתור. נרשמת לחיצה, ואז מעבר לכניסה הישירה עם הקוד שנשלח במייל.
//                            (אם הקוד הוחלף בינתיים - הקישור הישן לא יכניס, כמו שצריך)
// לחיצה נחשבת גם כפתיחה (אם התמונות נחסמו, הפיקסל לא נטען).

import { ensureSchema } from './schema.js';

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0));

export async function handleTracking(request, env, path, url) {
    const m = path.match(/^\/sms\/t\/(o|c)\/([a-f0-9]{32})(\.gif)?$/);
    if (!m) return null;
    const [, kind, token] = m;
    await ensureSchema(env);
    const now = Date.now();

    if (kind === 'o') {
        await env.DB.prepare(`UPDATE mail_log SET open_count = open_count + 1, opened_at = COALESCE(opened_at, ?), last_opened_at = ?
            WHERE token = ?`).bind(now, now, token).run();
        return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } });
    }

    const row = await env.DB.prepare('SELECT id, sent_code FROM mail_log WHERE token = ?').bind(token).first();
    if (!row) return Response.redirect(`${url.origin}/sms/`, 302);
    await env.DB.prepare(`UPDATE mail_log SET click_count = click_count + 1, clicked_at = COALESCE(clicked_at, ?), last_clicked_at = ?,
        opened_at = COALESCE(opened_at, ?), last_opened_at = COALESCE(last_opened_at, ?) WHERE id = ?`).bind(now, now, now, now, row.id).run();
    const target = row.sent_code ? `${url.origin}/sms?code=${encodeURIComponent(row.sent_code)}` : `${url.origin}/sms/`;
    return Response.redirect(target, 302);
}
