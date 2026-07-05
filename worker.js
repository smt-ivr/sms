import htmlContent from './html.js';
import cssContent from './css.js';
import mfaJsContent from './mfa.js';
import appJsContent from './app.js';
import handleAuthApi from './auth-api.js';
import handleAdminApi from './admin-api.js';
import handleProxyApi from './proxy-api.js';
import adminHtmlContent from './admin-html.js';
import adminCssContent from './admin-css.js';
import adminAppJsContent from './admin-app.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ניתוב ל-Proxy (תומך בנתיב המלא)
    if (path.startsWith('/sms/api/proxy/') || path.startsWith('/api/proxy/')) {
      return handleProxyApi(request, env);
    }

    // ניתוב ל-API הניהול ופורטל המשתמשים
    if (path.includes('/api/admin') || path.includes('/api/user')) {
      return handleAdminApi(request, env);
    }

    // ניתוב ל-API האבטחה
    if (path.includes('/api/auth')) {
      return handleAuthApi(request, env);
    }

    // עמוד פורטל הניהול והמשתמשים
    if (path.includes('/manage-tokens')) {
      return new Response(adminHtmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ספריות עיצוב ולוגיקה של פורטל הניהול
    if (path.endsWith('admin-style.css')) {
      return new Response(adminCssContent, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }
    if (path.endsWith('admin-app.js')) {
      return new Response(adminAppJsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }

    // ניתובים לאפליקציה הראשית
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
