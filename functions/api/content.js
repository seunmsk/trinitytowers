// GET  /api/content  -> the website's editable content (spaces, homepage text, contact details, video)
// PUT  /api/content  -> save content from the site manager (needs the admin password)
import { json, authed, notReady } from "../../lib/util.js";

export async function onRequestGet({ env }) {
  if (!env.CONTENT) return notReady();
  const content = await env.CONTENT.get("content", "json");
  return json(content || {}, 200, { "cache-control": "public, max-age=30" });
}

export async function onRequestPut({ request, env }) {
  if (!env.CONTENT) return notReady();
  if (!authed(request, env)) return json({ error: "Not authorised" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.spaces !== "object") return json({ error: "Content must include spaces" }, 400);
  const raw = JSON.stringify(body);
  if (raw.length > 200000) return json({ error: "Content is too large" }, 413);
  const previous = await env.CONTENT.get("content");
  if (previous) await env.CONTENT.put(`backup:${new Date().toISOString()}`, previous, { expirationTtl: 60 * 60 * 24 * 30 });
  await env.CONTENT.put("content", raw);
  return json({ ok: true, savedAt: new Date().toISOString() });
}
