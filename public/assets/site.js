/* Trinity Towers website: shared script for every public page.
   Content comes from /api/content (Cloudflare KV, edited in /admin/). Without the API
   (local file or preview) the defaults below are used, plus any edits saved in this browser. */
(function () {
"use strict";
const PAGE = document.body.dataset.page || "home";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ytId = (u) => { const m = String(u || "").match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(u) ? u : "LjWLaXUpDFA"); };

/* ---------- building data ---------- */
const PLANS = { 7: "floor-7", 8: "floor-8", 9: "floor-9", 10: "floor-8", 11: "floor-8" };
const T = ["North", "Central", "South"], TK = "NCS", NA = null;
// [label, floorNo, [north, central, south]]; cell: null (not available), "-" (no space), or [use, sqm, category]
const FLOORS = [
  ["Helipad", "H", ["-", ["Helipad", null, "special"], "-"]],
  ["Rooftop", "R", [NA, NA, NA]],
  ["12th", "12", [NA, NA, NA]],
  ...[11, 10, 9, 8].map((n) => [n + "th", n, [["Open office", 520, "office"], ["Open office", 746, "office"], ["Open office", 520, "office"]]]),
  ["7th", 7, [["Food court", 520, "leisure"], ["Cinema & multi-purpose (double volume)", 903, "leisure"], ["Games arcade", 590, "leisure"]]],
  ["6th", 6, [["Restaurant", 520, "leisure"], "-", ["Restaurant", 520, "leisure"]]],
  ["5th", 5, [["Conference & event centre", 800, "event"], ["Conference & event centre (double volume)", 859, "event"], ["Conference & event centre", 690, "event"]]],
  ["4th", "4", [NA, NA, NA]],
  ...[3, 2, 1].map((n) => [n + (n == 1 ? "st" : n == 2 ? "nd" : "rd"), String(n), [["Auditorium", null, "x"], ["Auditorium", null, "x"], ["Auditorium", null, "x"]]]),
  ["Foyer", "G", [NA, ["Main entrance", null, "x"], NA]],
];
const DEFAULTS = {
  heroEyebrow: "Now leasing · Immediate occupancy",
  heroTitle: "Three towers. *One address* on the Lagos skyline.",
  heroSub: "The first tri-tower building in West Africa. Offices, event halls, restaurants and leisure space across 12 floors, just off Ozumba Mbadiwe in Oniru, Victoria Island.",
  hours: "Mon–Fri 9am–5pm · Weekends by appointment",
  stat0n: 13000, stat0l: "sqm lettable space", stat1n: 673, stat1l: "car park spaces", stat2n: 2000, stat2l: "seat event venue", stat3n: 4500, stat3l: "seat concert hall",
  phone1: "0807 071 8734", phone2: "0806 020 4566", email: "trinitytowers@estatelinks.net", whatsapp: "2348070718734",
  video: "https://www.youtube.com/watch?v=LjWLaXUpDFA",
  spaces: {},
};
const key = (no, ti) => no + "-" + TK[ti];
function cell(fi, ti, src) {
  const [lab, no, cells] = FLOORS[fi]; const c = cells[ti]; if (!c || c === "-") return c;
  const [use, sqm, cat] = c; const o = ((src || C).spaces || {})[key(no, ti)] || {};
  return { lab, no, ti, key: key(no, ti), use: o.use ?? use, sqm: o.sqm ?? sqm, cat, status: cat === "x" ? "x" : (o.status || "available") };
}
const ST = { available: "Available now", offer: "Under offer", let: "Let" };
let C = structuredClone(DEFAULTS);

/* ---------- content loading ---------- */
const LOCAL_KEY = "tt-content-preview";
async function loadContent() {
  try {
    const r = await fetch("/api/content", { cache: "no-store" });
    if (r.ok && r.headers.get("x-tt-api")) { const d = await r.json(); return { live: true, data: d }; }
  } catch (e) { /* no API: preview */ }
  let d = {}; try { d = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch (e) {}
  return { live: false, data: d };
}
function merge(d) { const out = { ...structuredClone(DEFAULTS), ...(d || {}) }; out.spaces = { ...((d && d.spaces) || {}) }; return out; }

/* ---------- header menu ---------- */
const menuBtn = $("menu-btn"), mainNav = $("main-nav");
function closeMenu() { if (!mainNav) return; mainNav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.setAttribute("aria-label", "Open menu"); }
if (menuBtn) {
  menuBtn.addEventListener("click", () => { const o = !mainNav.classList.contains("open"); mainNav.classList.toggle("open", o); menuBtn.setAttribute("aria-expanded", o); menuBtn.setAttribute("aria-label", o ? "Close menu" : "Open menu"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
}
document.querySelectorAll("[data-nav]").forEach((a) => { if (a.dataset.nav === PAGE) a.setAttribute("aria-current", "page"); });

/* ---------- apply editable content ---------- */
const animOK = !matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window;
let counted = !animOK;
function applyContent() {
  document.querySelectorAll("[data-bind]").forEach((el) => { const v = C[el.dataset.bind]; if (v != null) el.textContent = v; });
  const ht = $("heroTitle"); if (ht) ht.innerHTML = esc(C.heroTitle).replace(/\*(.+?)\*/g, "<em>$1</em>");
  document.querySelectorAll(".stat .n").forEach((el, i) => { const n = +C["stat" + i + "n"] || 0; el.dataset.to = n; if (counted) el.textContent = n.toLocaleString("en-NG"); });
  const wa = String(C.whatsapp || "").replace(/\D/g, "");
  document.querySelectorAll(".js-wa,.wa").forEach((a) => (a.href = "https://wa.me/" + wa));
  document.querySelectorAll(".js-yt").forEach((a) => (a.href = "https://www.youtube.com/watch?v=" + ytId(C.video)));
  if (stack) { render(); show(sel || "5-C"); }
}

/* count-up figures: animate from 0 once the strip is on screen */
if (animOK) {
  const run = (el) => { const t0 = performance.now(), dur = 1800;
    const step = (t) => { const to = +el.dataset.to, p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e).toLocaleString("en-NG"); if (p < 1) requestAnimationFrame(step); else counted = true; };
    requestAnimationFrame(step); };
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.5 });
  document.querySelectorAll(".stat .n").forEach((el) => io.observe(el));
}

/* ---------- stacking plan (Spaces page) ---------- */
const stack = $("stack"), panel = $("panel");
let filter = "all", sel = "5-C";
function render() {
  let h = "<div></div>" + T.map((t) => `<div class="th">${t}</div>`).join("");
  FLOORS.forEach(([lab], fi) => {
    h += `<div class="fl">${lab}</div>`;
    [0, 1, 2].forEach((ti) => {
      const c = cell(fi, ti);
      if (c === "-") { h += '<div class="cell void"></div>'; return; }
      if (!c) { h += '<div class="cell"><span>Not available</span></div>'; return; }
      if (c.status === "x") { h += `<div class="cell"><span>${esc(c.use)}</span><small>Not available</small></div>`; return; }
      if (c.status === "let") { h += `<div class="cell let"><span>${esc(c.use)}</span><small>Let</small></div>`; return; }
      const dim = filter !== "all" && c.cat !== filter && c.cat !== "special";
      const size = c.sqm ? (+c.sqm).toLocaleString() + " sqm" : "Central Tower";
      h += `<button class="cell avail${c.status === "offer" ? " offer" : ""}${dim ? " dim" : ""}${sel === c.key ? " sel" : ""}" data-key="${c.key}" aria-label="${c.lab} floor, ${T[ti]} Tower: ${esc(c.use)}, ${ST[c.status]}"><span>${esc(c.use)}</span><small>${size}${c.status === "offer" ? " · Under offer" : ""}</small></button>`;
    });
  });
  stack.innerHTML = h;
}
function findKey(k) { for (let fi = 0; fi < FLOORS.length; fi++) for (let ti = 0; ti < 3; ti++) { const c = cell(fi, ti); if (c && c !== "-" && c.key === k) return c; } return null; }
function show(k) {
  const c = findKey(k);
  if (!c || c.status === "x" || c.status === "let") { panel.innerHTML = `<span class="eyebrow">Stacking plan</span><h3>Select a space</h3><p style="margin-top:12px">Pick any space marked with a green dot to see its details.</p>`; sel = null; render(); return; }
  sel = k; const plan = PLANS[c.no];
  const kind = { office: "Office", event: "Events", leisure: "Food & leisure", special: "Building feature" }[c.cat];
  const interest = c.cat === "event" ? "Event / conference space" : c.cat === "office" ? "Office space" : "Restaurant or food court";
  const note = c.lab + " floor, " + T[c.ti] + " Tower: " + c.use + (c.sqm ? " (" + c.sqm + " sqm)" : "");
  panel.innerHTML = `<span class="eyebrow">${c.lab} floor · ${T[c.ti]} Tower</span><h3>${esc(c.use)}</h3>
  <dl><dt>Size</dt><dd>${c.sqm ? (+c.sqm).toLocaleString() + " sqm" : "—"}</dd><dt>Use</dt><dd>${kind}</dd><dt>Status</dt><dd style="color:${c.status === "offer" ? "#b07a22" : "var(--ok)"}">${ST[c.status]}</dd>
  <dt>Terms</dt><dd>${c.cat === "event" ? "Lease or hire" : c.cat === "special" ? "Ask the team" : "Rent or long lease (up to 50 yrs)"}</dd></dl>
  <div class="acts">${plan ? `<button type="button" class="btn dark" data-plan="${plan}" data-plabel="${c.lab} floor plan${c.no == 10 || c.no == 11 ? " (typical office floor)" : ""}">Floor plan</button>` : ""}<a class="btn solid" href="/contact/" data-interest="${interest}" data-note="${esc(note)}">Enquire</a></div>`;
  render();
}
if (stack) {
  panel.addEventListener("click", (e) => { const b = e.target.closest("[data-plan]"); if (b) openLb([[b.dataset.plan, b.dataset.plabel]], 0, true); });
  stack.addEventListener("click", (e) => { const b = e.target.closest(".cell.avail"); if (b) show(b.dataset.key); });
  document.querySelectorAll(".chip[data-f]").forEach((c) => c.addEventListener("click", () => { filter = c.dataset.f; document.querySelectorAll(".chip[data-f]").forEach((x) => x.setAttribute("aria-pressed", x === c)); render(); }));
}

/* ---------- enquiry links carry the space to the Contact page ---------- */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-interest]"); if (!a) return;
  const form = $("tourform");
  if (form) { e.preventDefault(); prefill(a.dataset.interest, a.dataset.note); form.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const q = new URLSearchParams({ interest: a.dataset.interest }); if (a.dataset.note) q.set("note", a.dataset.note);
  a.href = "/contact/?" + q.toString() + "#book";
});
function prefill(interest, note) {
  const s = $("interest"); if (s && interest) [...s.options].forEach((o) => { if (o.text === interest) s.value = o.text; });
  if (note && $("msg")) $("msg").value = "Interested in: " + note;
}

/* ---------- video: plays on the page ---------- */
const poster = $("poster");
if (poster) poster.addEventListener("click", (e) => {
  e.preventDefault();
  $("player").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId(C.video)}?autoplay=1&rel=0" title="Trinity Towers video tour" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
});

/* ---------- map (Contact page): pinned to the building's entrance ---------- */
const map = $("map");
if (map) {
  map.innerHTML = '<iframe src="https://maps.google.com/maps?q=6.430467,3.443546&z=17&output=embed" title="Map: Trinity Towers, Oniru, Victoria Island" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
  map.hidden = false;
}

/* ---------- tour booking (Contact page) ---------- */
const form = $("tourform");
if (form) {
  const q = new URLSearchParams(location.search); prefill(q.get("interest"), q.get("note"));
  const d = new Date(); d.setDate(d.getDate() + 2); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  $("dt").value = d.toISOString().slice(0, 10); $("dt").min = new Date().toISOString().slice(0, 10);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, done = $("done"), btn = f.querySelector("button[type=submit]");
    const miss = [...f.querySelectorAll("[required]")].filter((i) => !i.value.trim());
    done.hidden = false; done.classList.remove("bad");
    if (miss.length) { done.classList.add("bad"); done.textContent = "Please fill in: " + miss.map((i) => f.querySelector(`label[for=${i.id}]`).textContent.toLowerCase()).join(", ") + "."; return; }
    const day = new Date(f.dt.value + "T00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    btn.disabled = true; done.textContent = "Sending…";
    let ok = false;
    try {
      const r = await fetch("/api/enquiry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        type: "Tour request", name: (f.fn.value + " " + f.ln.value).trim(), email: f.em.value, phone: f.ph.value,
        interest: f.interest.value, date: f.dt.value, time: f.tm.value, notes: f.msg.value, website: f.website.value }) });
      ok = r.ok && !!r.headers.get("x-tt-api");
    } catch (err) {}
    btn.disabled = false;
    if (ok) {
      done.innerHTML = `<b>Tour request sent.</b> Thank you, ${esc(f.fn.value)}. You asked to view <b>${esc(f.interest.value.toLowerCase())}</b> on ${day} at ${esc(f.tm.value)}. The leasing team will call or email to confirm.`;
      f.reset(); $("dt").value = d.toISOString().slice(0, 10);
    } else {
      done.classList.add("bad");
      done.innerHTML = `We couldn't send your request just now. Please call <b>${esc(C.phone1)}</b> or message us on WhatsApp, and we'll book your visit.`;
    }
  });
}

/* ---------- gallery + facilities photos ---------- */
const G = [
  ["night-aerial", "The towers at night", "exterior", "big"], ["front-aerial", "Front elevation", "exterior"], ["helicopter", "Helicopter on the helipad", "facilities"], ["auditorium", "Auditorium", "interior"],
  ["oniru-skyline", "On the Oniru skyline", "exterior"], ["event-hall", "Conference & event floor", "interior"], ["helipad-above", "Helipad from above", "exterior"], ["main-entrance", "Main entrance", "exterior"],
  ["auditorium-balcony", "Auditorium balcony", "interior"], ["escalators", "Escalators to the auditorium", "interior"], ["roof-garden", "Roof garden terrace", "facilities"], ["helipad-angle", "Helipad and Central tower", "exterior"],
  ["banking-hall", "Banking hall", "facilities"], ["atm-gallery", "ATM gallery", "facilities"], ["video-banking", "Video banking", "facilities"], ["bank-entrance", "Bank entrance", "facilities"],
  ["car-park", "Multi-storey car park", "facilities"], ["car-park-2", "Car park ramps and bays", "facilities"], ["car-park-roof", "Car park and roof garden", "exterior"], ["side-elevation", "Side elevation", "exterior"],
  ["open-floor", "Open floor, ready for fit-out", "interior"], ["lounge", "Lounge", "interior"], ["washroom", "Washrooms", "interior"], ["washroom-2", "Washroom vanity", "interior"], ["helipad-top", "Helipad, looking down", "exterior"],
];
const FAC = [["helicopter", "Helipad"], ["car-park", "Multi-storey car park"], ["roof-garden", "Roof garden terrace"], ["banking-hall", "Banking hall"], ["atm-gallery", "ATM gallery"], ["escalators", "Escalators and lifts"], ["gymnasium", "Gymnasium"], ["ev-charging", "EV charging"], ["games-arcade", "Games arcade"]];
let gFilter = "all";
function renderGallery() {
  const list = G.filter((g) => gFilter === "all" || g[2] === gFilter);
  const grid = $("ggrid");
  grid.innerHTML = list.map(([p, c, , k], i) => `<figure class="${gFilter === "all" && k ? k : ""}"><button type="button" data-lb="${i}" aria-label="View photo: ${esc(c)}"><img src="/img/${p}.jpg" alt="Trinity Towers: ${esc(c)}" loading="lazy"></button><figcaption>${esc(c)}</figcaption></figure>`).join("");
  $("g-count").textContent = list.length + " photos";
  grid.onclick = (e) => { const b = e.target.closest("[data-lb]"); if (b) openLb(list, +b.dataset.lb); };
}
if ($("ggrid")) {
  document.querySelectorAll("[data-g]").forEach((c) => c.addEventListener("click", () => { gFilter = c.dataset.g; document.querySelectorAll("[data-g]").forEach((x) => x.setAttribute("aria-pressed", x === c)); renderGallery(); }));
  renderGallery();
}
const fac = $("facphotos");
if (fac) {
  fac.innerHTML = FAC.map(([n, c], i) => `<button type="button" data-lb="${i}" aria-label="View photo: ${esc(c)}"><img src="/img/${n}.jpg" alt="${esc(c)}" loading="lazy"><span>${esc(c)}</span></button>`).join("");
  fac.onclick = (e) => { const b = e.target.closest("[data-lb]"); if (b) openLb(FAC, +b.dataset.lb); };
}

/* ---------- photo viewer ---------- */
const lb = $("lb"); let lbList = [], lbI = 0, lbReturn = null;
function lbShow() { const [p, c] = lbList[lbI]; const im = $("lb-img"); im.src = "/img/" + p + ".jpg"; im.alt = c; $("lb-cap").textContent = c; $("lb-count").textContent = lbList.length > 1 ? (lbI + 1) + " / " + lbList.length : ""; }
function openLb(list, i, isPlan) {
  lbList = list; lbI = i; const st = lb.querySelector(".lb-stage"); st.classList.remove("zoom");
  const z = $("lb-zoom"); z.hidden = !isPlan; z.textContent = "Zoom in"; lb.classList.toggle("single", list.length < 2);
  lbReturn = document.activeElement; lb.hidden = false; document.body.style.overflow = "hidden"; lbShow(); $("lb-close").focus();
}
function closeLb() { lb.hidden = true; document.body.style.overflow = ""; if (lbReturn) lbReturn.focus(); }
const step = (d) => { lbI = (lbI + d + lbList.length) % lbList.length; lbShow(); };
if (lb) {
  $("lb-close").onclick = closeLb; $("lb-prev").onclick = () => step(-1); $("lb-next").onclick = () => step(1);
  $("lb-zoom").onclick = () => { const on = lb.querySelector(".lb-stage").classList.toggle("zoom"); $("lb-zoom").textContent = on ? "Fit to screen" : "Zoom in"; };
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-stage")) closeLb(); });
  document.addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") closeLb(); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1); });
  let tx = null;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { if (tx == null || lb.querySelector(".zoom")) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); tx = null; });
}

/* ---------- hero drawing: North and South rise above Central ---------- */
const lights = $("lights");
if (lights) { let s = ""; const seed = (n) => ((n * 9301 + 49297) % 233280) / 233280; let k = 1;
  [[40, 40, 110, 330, 4, 13], [150, 96, 120, 274, 4, 10], [270, 40, 110, 330, 4, 13]].forEach(([x, y, w, h, c, rows]) => { const rh = (h - 20) / rows; for (let r = 0; r < rows; r++) for (let i = 0; i < c; i++) { k++; const on = seed(k * 7) > 0.35; const cw = (w - 20) / c; s += `<rect x="${x + 10 + i * cw + 2}" y="${y + 10 + r * rh + 3}" width="${cw - 4}" height="${rh - 7}" fill="#cabe9f" fill-opacity="${on ? (0.25 + seed(k) * 0.6).toFixed(2) : 0.06}"/>`; } });
  lights.innerHTML = s; }

/* ---------- start ---------- */
applyContent();
loadContent().then(({ data }) => { C = merge(data); applyContent(); });

// shared with the admin page
window.TT = { FLOORS, T, DEFAULTS, cell, merge, esc, loadContent, LOCAL_KEY };
})();
