// Runs the Pages Functions against an in-memory KV stand-in. `npm test`
import assert from "node:assert/strict";
import * as content from "../functions/api/content.js";
import * as enquiry from "../functions/api/enquiry.js";
import * as enquiries from "../functions/api/enquiries.js";

const kv = new Map();
const env = {
  ADMIN_PASSWORD: "s3cret-pass",
  CONTENT: { async get(k, t) { const v = kv.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; }, async put(k, v) { kv.set(k, v); } },
};
const req = (method, body, headers = {}) => new Request("https://x.test/", { method, body, headers });
const auth = { authorization: "Bearer s3cret-pass" };

let r = await content.onRequestGet({ env });
assert.equal(r.headers.get("x-tt-api"), "1"); assert.deepEqual(await r.json(), {});
r = await content.onRequestPut({ env, request: req("PUT", JSON.stringify({ spaces: {} }), { authorization: "Bearer wrong" }) });
assert.equal(r.status, 401);
r = await content.onRequestPut({ env, request: req("PUT", JSON.stringify({ heroSub: "x" }), auth) });
assert.equal(r.status, 400, "content without spaces is refused");
r = await content.onRequestPut({ env, request: req("PUT", JSON.stringify({ spaces: { "8-N": { status: "let" } }, phone1: "0800" }), auth) });
assert.equal(r.status, 200);
assert.equal((await (await content.onRequestGet({ env })).json()).spaces["8-N"].status, "let");
await content.onRequestPut({ env, request: req("PUT", JSON.stringify({ spaces: {} }), auth) });
assert.ok([...kv.keys()].some((k) => k.startsWith("backup:")), "previous content is backed up");

r = await enquiry.onRequestPost({ env, request: req("POST", JSON.stringify({ type: "Tour request", name: "Ada Obi", phone: "0803", interest: "Office space", date: "2026-11-10", time: "11:00 am" })) });
assert.equal(r.status, 200);
r = await enquiry.onRequestPost({ env, request: req("POST", JSON.stringify({ type: "x" })) });
assert.equal(r.status, 400);
r = await enquiry.onRequestPost({ env, request: req("POST", JSON.stringify({ name: "bot", website: "spam" })) });
assert.equal(r.status, 200);
r = await enquiries.onRequestGet({ env, request: req("GET") });
assert.equal(r.status, 401);
const list = await (await enquiries.onRequestGet({ env, request: req("GET", null, auth) })).json();
assert.equal(list.length, 1, "honeypot submissions are not saved");
assert.equal(list[0].name, "Ada Obi"); assert.equal(list[0].interest, "Office space"); assert.equal(list[0].status, "New");
list[0].status = "Contacted";
await enquiries.onRequestPut({ env, request: req("PUT", JSON.stringify(list), auth) });
assert.equal((await (await enquiries.onRequestGet({ env, request: req("GET", null, auth) })).json())[0].status, "Contacted");
console.log("All function tests passed");
