/* api/peek.js — TEMPORARY. DELETE AFTER USE.
 *
 * Answers one question: what fields does Clickacourier's BookingStatus return,
 * and is an ETA among them?
 *
 * It returns field NAMES and the TYPE of each value. Never the values. So a
 * customer's name comes back as "customer: string (11 chars)" rather than the
 * name itself, and no personal data passes through this endpoint at all.
 *
 *   /api/peek?ref=<job number>&key=peek-and-delete-me
 *
 * Still delete it when you are done. A field list is not sensitive, but an
 * endpoint nobody remembers adding is its own kind of problem.
 */

const API = "https://booking-api.cyclonegroup.ie/click_ext";
const GATE = "peek-and-delete-me";

function accounts() {
  try { return JSON.parse(process.env.CYCLONE_STATUS_UUIDS || "{}"); }
  catch { return {}; }
}

/* Describe a value without revealing it. Dates are the exception: an ISO
   timestamp is the shape we are hunting for, so the shape is worth showing,
   and a timestamp on its own identifies nobody. */
function shapeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array (" + v.length + ")";
  if (typeof v === "object") return "object {" + Object.keys(v).join(", ") + "}";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return "timestamp, e.g. " + s.slice(0, 16);
  return "string (" + s.length + " chars)";
}

function describe(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = shapeOf(v);
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if ((req.query && req.query.key) !== GATE) return res.status(404).json({ error: "not found" });

  const ref = String((req.query && req.query.ref) || "").replace(/[^0-9]/g, "");
  if (!ref) return res.status(400).json({ error: "add ?ref=<job number>" });

  const key = process.env.CYCLONE_API_KEY;
  if (!key) return res.status(500).json({ error: "no api key configured" });

  for (const [slug, uuid] of Object.entries(accounts())) {
    const url = API + "/BookingStatus/" + encodeURIComponent(ref) + "/" + encodeURIComponent(uuid);
    try {
      const r = await fetch(url, { method: "GET", headers: { "X-API-Key": key, "Accept": "application/json" } });
      if (!r.ok) continue;
      const body = await r.json();

      /* anything that smells like a time estimate, by name */
      const hay = JSON.stringify(Object.keys(body || {})) +
                  JSON.stringify(body && body.events && body.events[0] ? Object.keys(body.events[0]) : []);
      const looksLikeEta = /eta|estimat|expect|due|window|promis|slot/i.test(hay);

      return res.status(200).json({
        found: true,
        anyFieldLookingLikeAnEta: looksLikeEta,
        topLevel: describe(body),
        firstEvent: body && body.events && body.events[0] ? describe(body.events[0]) : null,
        lastEvent: body && body.events && body.events.length
          ? describe(body.events[body.events.length - 1]) : null,
        eventCount: body && body.events ? body.events.length : 0
      });
    } catch (e) { /* try the next account */ }
  }
  return res.status(200).json({ found: false });
}
