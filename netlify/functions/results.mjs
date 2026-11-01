import { getStore } from "@netlify/blobs";

// One record per test attempt, stored in Netlify Blobs under "r/<id>".
// Student page: POST new results, GET a short list (no answers).
// Portal: needs the PIN (env PORTAL_PIN) to see full results, mark Part B or delete.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const pinOk = (req) => {
  const pin = process.env.PORTAL_PIN || "";
  return pin && req.headers.get("x-pin") === pin;
};

const ALLOWED = ["testId","kind","testLabel","score","total","pct","wrongTopics","bySubject","ans","timeSec","at","partB","partBTotal","fromDevice","clientId"];

export default async (req) => {
  const store = getStore({ name: "test-room", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.searchParams.get("check") === "pin") return json({ ok: pinOk(req) }, pinOk(req) ? 200 : 401);
    const full = pinOk(req);
    const { blobs } = await store.list({ prefix: "r/" });
    const rows = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" }))))
      .filter(Boolean)
      .map(r => full ? r : { _id: r._id, testId: r.testId, kind: r.kind, score: r.score, total: r.total, pct: r.pct, at: r.at, clientId: r.clientId });
    rows.sort((a, b) => a.at - b.at);
    return json({ rows, full });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body.testId !== "string" || typeof body.score !== "number") return json({ error: "Missing fields" }, 400);
    const rec = {};
    for (const k of ALLOWED) if (k in body) rec[k] = body[k];
    if (JSON.stringify(rec).length > 60000) return json({ error: "Too large" }, 413);
    // Same attempt sent twice (retry from the phone) is stored once.
    const id = (typeof rec.clientId === "string" && /^[a-z0-9-]{6,40}$/i.test(rec.clientId)) ? rec.clientId : crypto.randomUUID();
    const existing = await store.get("r/" + id, { type: "json" });
    if (existing) return json({ _id: id, duplicate: true });
    rec._id = id;
    rec.at = typeof rec.at === "number" ? rec.at : Date.now();
    await store.setJSON("r/" + id, rec);
    return json({ _id: id }, 201);
  }

  if (req.method === "PATCH") {
    if (!pinOk(req)) return json({ error: "Wrong PIN" }, 401);
    const id = url.searchParams.get("id");
    const rec = id && await store.get("r/" + id, { type: "json" });
    if (!rec) return json({ error: "Not found" }, 404);
    const body = await req.json().catch(() => ({}));
    if ("partB" in body) rec.partB = body.partB === null ? null : Number(body.partB);
    if ("score" in body) { rec.score = Number(body.score); rec.pct = Math.round(rec.score / rec.total * 100); rec.edited = true; }
    await store.setJSON("r/" + id, rec);
    return json(rec);
  }

  if (req.method === "DELETE") {
    if (!pinOk(req)) return json({ error: "Wrong PIN" }, 401);
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id" }, 400);
    await store.delete("r/" + id);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};
