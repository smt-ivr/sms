import htmlContent from './html.js';
import cssContent from './css.js';
import mfaJsContent from './mfa.js';
import appJsContent from './app.js';
import handleAuthApi from './auth-api.js';
import handleAdminApi from './admin-api.js';
import adminHtmlContent from './admin-html.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ניתוב ל-API הניהול
    if (path.startsWith('/api/admin')) {
      return handleAdminApi(request, env);
    }

    // ניתוב ל-API האבטחה וההתחברות
    if (path.startsWith('/api/auth')) {
      return handleAuthApi(request, env);
    }

    // עמוד ניהול הטוקנים (פאנל הניהול)
    if (path.endsWith('/manage-tokens')) {
      return new Response(adminHtmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // תיקון הניתוב: הוספת סלאש אוטומטית אם חסר
    if (path === '/sms') {
      return Response.redirect(url.origin + '/sms/', 301);
    }

    if (path === '/' || path === '/index.html' || path === '/sms/') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

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

    return new Response('404 Not Found (Path: ' + path + ')', { status: 404 });
  },
};
