/* Trinity Towers site manager (/admin/). Saves to /api/content and reads tour requests
   from /api/enquiries, both protected by the ADMIN_PASSWORD secret.
   Without the API (preview) it saves in this browser only and the password is "admin". */
(function () {
"use strict";
const $ = (id) => document.getElementById(id);
const { FLOORS, T, cell, merge, esc, loadContent, LOCAL_KEY } = window.TT;
let live = false, pass = "", C = null, D = null, dirty = false, tours = [];

try { pass = sessionStorage.getItem("tt-admin") || ""; } catch (e) {}
const auth = () => ({ authorization: "Bearer " + pass });

async function checkPassword(p) {
  if (!live) return p === "admin";
  try { const r = await fetch("/api/enquiries", { headers: { authorization: "Bearer " + p } }); return r.ok; } catch (e) { return false; }
}

async function start() {
  const res = await loadContent(); live = res.live; C = merge(res.data);
  $("adm-who").textContent = live ? "Live" : "Preview";
  const n = $("adm-notice");
  n.hidden = live;
  if (!live) n.textContent = "Preview mode: storage isn't connected yet, so changes save in this browser only. Follow the README to connect it.";
  if (pass && (await checkPassword(pass))) return openAdmin();
  $("login").hidden = false; $("pw").focus();
}

$("loginform").addEventListener("submit", async (e) => {
  e.preventDefault(); const p = $("pw").value; const msg = $("pw-msg");
  msg.textContent = "Checking…";
  if (await checkPassword(p)) { pass = p; try { sessionStorage.setItem("tt-admin", p); } catch (e) {} msg.textContent = ""; openAdmin(); }
  else msg.textContent = "That password isn't right. Try again, or ask whoever set up the site.";
});
$("adm-logout").addEventListener("click", () => { try { sessionStorage.removeItem("tt-admin"); } catch (e) {} location.reload(); });

function openAdmin() { $("login").hidden = true; $("admin").hidden = false; fillAdmin(); loadTours(); }

function fillAdmin() {
  D = structuredClone(C);
  document.querySelectorAll("#admin [data-k]").forEach((i) => (i.value = D[i.dataset.k] ?? ""));
  let rows = "";
  FLOORS.forEach((f, fi) => [0, 1, 2].forEach((ti) => {
    const c = cell(fi, ti, D); if (!c || c === "-" || c.status === "x") return;
    rows += `<tr data-row="${c.key}"><td>${c.lab}</td><td>${T[ti]}</td><td><input id="s-${c.key}-use" data-sk="${c.key}" data-f="use" value="${esc(c.use)}" aria-label="Use"></td><td class="num"><input id="s-${c.key}-sqm" type="number" data-sk="${c.key}" data-f="sqm" value="${c.sqm ?? ""}" aria-label="Size in sqm"></td><td><select id="s-${c.key}-st" data-sk="${c.key}" data-f="status" aria-label="Status"><option value="available"${c.status === "available" ? " selected" : ""}>Available</option><option value="offer"${c.status === "offer" ? " selected" : ""}>Under offer</option><option value="let"${c.status === "let" ? " selected" : ""}>Let</option></select></td></tr>`;
  }));
  $("adm-spaces").innerHTML = rows;
  summary(); setState(false);
}
function summary() {
  let a = 0, o = 0, l = 0, sq = 0;
  FLOORS.forEach((f, fi) => [0, 1, 2].forEach((ti) => { const c = cell(fi, ti, D); if (!c || c === "-" || c.status === "x") return; if (c.status === "available") { a++; sq += +c.sqm || 0; } else if (c.status === "offer") o++; else l++; }));
  $("adm-summary").innerHTML = `<div><b>${a}</b><span>Available · ${sq.toLocaleString()} sqm</span></div><div><b>${o}</b><span>Under offer</span></div><div><b>${l}</b><span>Let</span></div>`;
}
function setState(isDirty, msg, cls) { dirty = isDirty; const s = $("adm-state"); s.className = "save-state" + (cls ? " " + cls : ""); s.textContent = msg || (isDirty ? "Unsaved changes" : "No unsaved changes"); }
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

$("admin").addEventListener("input", (e) => {
  const t = e.target; if (!D) return;
  if (t.dataset.k) D[t.dataset.k] = t.type === "number" ? +t.value : t.value;
  else if (t.dataset.sk) { const k = t.dataset.sk; D.spaces[k] = { ...(D.spaces[k] || {}) }; D.spaces[k][t.dataset.f] = t.dataset.f === "sqm" ? (t.value === "" ? null : +t.value) : t.value; t.closest("tr").classList.add("changed"); summary(); }
  else return;
  setState(true);
});

$("adm-save").addEventListener("click", async () => {
  if (!D) return;
  setState(true, "Publishing…");
  if (!live) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(D)); } catch (e) {} C = structuredClone(D); setState(false, "Saved in this browser only (preview)", "warn"); return; }
  try {
    const r = await fetch("/api/content", { method: "PUT", headers: { "content-type": "application/json", ...auth() }, body: JSON.stringify(D) });
    if (r.status === 401) { setState(true, "Your session has ended. Log out and sign in again.", "warn"); return; }
    if (!r.ok) throw new Error();
    C = structuredClone(D); setState(false, "Published · live on the site", "ok");
    document.querySelectorAll("#adm-spaces tr.changed").forEach((x) => x.classList.remove("changed"));
  } catch (e) { setState(true, "Couldn't publish. Check your connection and try again.", "warn"); }
});

document.querySelectorAll(".admin-nav [data-tab]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".admin-nav [data-tab]").forEach((x) => x.setAttribute("aria-selected", x === b));
  document.querySelectorAll("#admin [data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
}));

/* tour requests */
async function loadTours() {
  if (!live) { tours = []; renderTours(); return; }
  try { const r = await fetch("/api/enquiries", { headers: auth() }); tours = r.ok ? await r.json() : []; } catch (e) { tours = []; }
  renderTours();
}
function renderTours() {
  const box = $("adm-tours"), cnt = $("tour-count");
  const open = tours.filter((t) => t.status !== "Contacted").length; cnt.hidden = !open; cnt.textContent = open;
  if (!live) { box.innerHTML = '<div class="empty">Tour requests appear here once the site is live and storage is connected.</div>'; return; }
  if (!tours.length) { box.innerHTML = '<div class="empty">No tour requests yet. When someone books a visit on the Contact page, it appears here with their details and preferred date.</div>'; return; }
  box.innerHTML = tours.map((t, i) => {
    const day = t.date ? new Date(t.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";
    const sent = t.at ? new Date(t.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const done = t.status === "Contacted";
    return `<div class="req${done ? " done-req" : ""}"><h3>${esc(t.name)} · ${esc(t.interest || t.type)}</h3><button class="btn dark" type="button" data-i="${i}">${done ? "Mark as new" : "Mark contacted"}</button>
    <p>Visit: ${day} ${esc(t.time || "")} · ${esc(t.phone)}${t.email ? " · " + esc(t.email) : ""}</p><p style="grid-column:1/-1;font-size:.74rem">Sent ${sent}</p>${t.notes ? `<p style="grid-column:1/-1">${esc(t.notes)}</p>` : ""}</div>`;
  }).join("");
}
$("adm-tours").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-i]"); if (!b) return; b.disabled = true;
  const t = tours[+b.dataset.i]; const prev = t.status; t.status = t.status === "Contacted" ? "New" : "Contacted";
  try { const r = await fetch("/api/enquiries", { method: "PUT", headers: { "content-type": "application/json", ...auth() }, body: JSON.stringify(tours) }); if (!r.ok) throw new Error(); }
  catch (err) { t.status = prev; }
  renderTours();
});

start();
})();
