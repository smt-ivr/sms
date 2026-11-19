import { fail } from './http.js';

const YM_API = 'https://www.call2all.co.il/ym/api/';
const UPSTREAM_TIMEOUT_MS = 15000;

// ------------------------------------------
//  קריאה לימות המשיח
// ------------------------------------------
export async function callYm(action, token, params) {
    const target = new URL(YM_API + action);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') target.searchParams.set(key, String(value));
    }
    target.searchParams.set('token', token);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let res, text;
    try {
        res = await fetch(target.toString(), { signal: controller.signal });
        text = await res.text();
    } catch (e) {
        return { error: fail(e.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE') };
    } finally {
        clearTimeout(timer);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        return { error: fail('UPSTREAM_BAD_RESPONSE', undefined, { upstreamHttpStatus: res.status }) };
    }

    if (!data || data.responseStatus !== 'OK') {
        return {
            error: fail('UPSTREAM_REJECTED', data?.message ? `ימות המשיח: ${data.message}` : undefined, {
                upstreamStatus: data?.responseStatus ?? null,
            }),
        };
    }
    return { data };
}
