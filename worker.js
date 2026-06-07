import htmlContent from './html.js';
import cssContent from './css.js';
import mfaJsContent from './mfaJs.js';
import appJsContent from './appJs.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ניתוב דף הבית (HTML)
    if (path === '/' || path === '/index.html') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ניתוב קובץ העיצוב (CSS)
    if (path === '/style.css') {
      return new Response(cssContent, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }

    // ניתוב קבצי הסקריפט (JS)
    if (path === '/mfa.js') {
      return new Response(mfaJsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }

    if (path === '/app.js') {
      return new Response(appJsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }

    // אם הנתיב לא נמצא
    return new Response('404 Not Found', { status: 404 });
  },
};
