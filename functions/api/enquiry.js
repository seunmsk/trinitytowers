// POST /api/enquiry -> public endpoint for the Book a tour form on the Contact page.
// Saves to the site manager's Tour requests and, if RESEND_API_KEY and NOTIFY_EMAIL are set, emails the leasing team.
import { json, clip, notReady } from "../../lib/util.js";

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.CONTENT) return notReady();
  let e;
  try { e = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!e || (!e.name && !e.phone)) return json({ error: "Add a name or phone number" }, 400);
  if (e.website) return json({ ok: true }); // honeypot field: bots fill it, people never see it

  const item = {
    id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    status: "New",
    type: clip(e.type, 40) || "Tour request",
    name: clip(e.name, 120), phone: clip(e.phone, 40), email: clip(e.email, 160),
    interest: clip(e.interest, 80), date: clip(e.date, 10), time: clip(e.time, 20), notes: clip(e.notes, 2000),
  };

  const list = (await env.CONTENT.get("enquiries", "json")) || [];
  list.unshift(item);
  await env.CONTENT.put("enquiries", JSON.stringify(list.slice(0, 1000)));

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const lines = [
      `${item.type}: ${item.interest}`,
      `Name: ${item.name}`, `Phone: ${item.phone}`, item.email && `Email: ${item.email}`,
      item.date && `Preferred visit: ${item.date} ${item.time}`, item.notes && `Notes: ${item.notes}`,
    ].filter(Boolean);
    const send = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.NOTIFY_FROM || "Trinity Towers website <onboarding@resend.dev>", to: env.NOTIFY_EMAIL.split(","), reply_to: item.email || undefined, subject: `New tour request from ${item.name || item.phone}`, text: lines.join("\n") }),
    }).catch(() => {});
    if (waitUntil) waitUntil(send);
  }
  return json({ ok: true, id: item.id });
}
