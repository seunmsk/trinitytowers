// Shared helpers for the Pages Functions.
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-tt-api": "1", ...extra },
  });

// The admin password lives in the ADMIN_PASSWORD secret. The site sends it as "Authorization: Bearer <password>".
export function authed(request, env) {
  const h = request.headers.get("authorization") || "";
  const given = h.startsWith("Bearer ") ? h.slice(7) : "";
  const want = env.ADMIN_PASSWORD || "";
  if (!want || !given) return false;
  const a = new TextEncoder().encode(given), b = new TextEncoder().encode(want);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const clip = (v, n = 500) => (v == null ? "" : String(v).slice(0, n));

// Before KV is connected in the dashboard, answer without the x-tt-api header so the
// site keeps working in its preview mode instead of failing.
export const notReady = () => new Response("Storage not connected yet", { status: 503, headers: { "cache-control": "no-store" } });
