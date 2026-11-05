// GET /api/enquiries -> tour requests for the site manager; PUT saves status changes. Both need the admin password.
import { json, authed, notReady } from "../../lib/util.js";

export async function onRequestGet({ request, env }) {
  if (!env.CONTENT) return notReady();
  if (!authed(request, env)) return json({ error: "Not authorised" }, 401);
  return json((await env.CONTENT.get("enquiries", "json")) || []);
}

export async function onRequestPut({ request, env }) {
  if (!env.CONTENT) return notReady();
  if (!authed(request, env)) return json({ error: "Not authorised" }, 401);
  let list;
  try { list = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!Array.isArray(list)) return json({ error: "Expected a list" }, 400);
  await env.CONTENT.put("enquiries", JSON.stringify(list.slice(0, 1000)));
  return json({ ok: true });
}
