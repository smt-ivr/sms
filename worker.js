import htmlContent from './html.js';
import cssContent from './css.js';
import mfaJsContent from './mfa.js';
import appJsContent from './app.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ניתוב דף הבית - עכשיו מקבל גם את /sms וגם את /sms/
    if (path === '/' || path === '/index.html' || path === '/sms' || path === '/sms/') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // שימוש ב-endsWith כדי שזה יעבוד גם אם הנתיב הוא /style.css וגם אם הוא /sms/style.css
    if (path.endsWith('style.css')) {
      return new Response(cssContent, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }

    if (path.endsWith('mfa.js')) {
      return new Response(mfaJsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }

    if (path.endsWith('app.js')) {
      return new Response(appJsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }

    // במקרה של שגיאה, הוספתי את הנתיב שמחפשים כדי שיהיה לך קל לדבג אם חסר משהו
    return new Response('404 Not Found (Path: ' + path + ')', { status: 404 });
  },
};
