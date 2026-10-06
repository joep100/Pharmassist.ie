/**
 * Cancel a booking
 *
 * The page posts here, this adds the API key and asks Clickacourier to pull the
 * job. Same reason as api/booking.js and api/status.js: the key cannot live in
 * the page, where anyone could read it.
 *
 * Becomes:  POST https://your-site/api/cancel
 *
 * Body:     { "trackingNumber": "11095404", "shop": "susanhunter" }
 * Returns:  { ok: true } or { error, detail }
 *
 * Needs, in the Vercel project:
 *   CYCLONE_API_KEY       the booking API key
 *   CYCLONE_STATUS_UUIDS  JSON, slug to uuid, one per shop, from Clickacourier
 *
 * The uuid is the same per-customer one the status lookup uses, so there is one
 * variable to keep up to date rather than two.
 */

const BASE = "https://booking-api.cyclonegroup.ie/click_ext";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) throw new Error("empty body");
  return JSON.parse(raw);
}

module.exports = async function handler(req, res) {
  try {
    return await cancel(req, res);
  } catch (err) {
    return res.status(500).json({
      error: "The cancel service hit a problem.",
      detail: String(err && err.stack ? err.stack.split("\n")[0] : err)
    });
  }
};

async function cancel(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Send this as a POST." });
  }

  const key = process.env.CYCLONE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "CYCLONE_API_KEY is not set in Vercel." });
  }

  let b;
  try {
    b = await readBody(req);
  } catch (e) {
    return res.status(400).json({ error: "Could not read the request." });
  }

  const tracking = String(b.trackingNumber || "").trim();
  const shop = String(b.shop || "").trim().toLowerCase();

  let uuid = "";
  try {
    const map = JSON.parse(process.env.CYCLONE_STATUS_UUIDS || "{}");
    uuid = String(map[shop] || map["*"] || "").trim();
  } catch (e) {
    return res.status(500).json({ error: "CYCLONE_STATUS_UUIDS is not valid JSON." });
  }

  if (!tracking) return res.status(400).json({ error: "Need a trackingNumber." });
  if (!shop)     return res.status(400).json({ error: "Need a shop." });
  if (!uuid) {
    return res.status(500).json({
      error: "No uuid for this shop.",
      detail: "Add \"" + shop + "\" to CYCLONE_STATUS_UUIDS in Vercel, then redeploy."
    });
  }

  let upstream, text, data = null;
  try {
    upstream = await fetch(BASE + "/CancelBooking", {
      method: "POST",
      headers: {
        "X-API-Key": key,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ trackingNumber: tracking, uuid: uuid })
    });
    text = await upstream.text();
    try { data = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
  } catch (err) {
    return res.status(502).json({
      error: "Could not reach the booking service.",
      detail: String(err && err.message ? err.message : err)
    });
  }

  /* Their reply can be a 200 carrying success:false, so the body decides rather
     than the status code. A refusal usually means a rider already has it, which
     is a phone call rather than an error. */
  const msgs = (data && (data.errorMessages || data.error_messages)) || [];
  const refused = !upstream.ok || (data && data.success === false);

  if (refused) {
    return res.status(409).json({
      error: "Cyclone could not cancel that one.",
      detail: Array.isArray(msgs) && msgs.length
        ? msgs.join("; ")
        : "It may already be with a rider. Ring 01 425 5722 and we will sort it.",
      reply: data || String(text).slice(0, 400)
    });
  }

  return res.status(200).json({
    ok: true,
    trackingNumber: (data && data.trackingNumber) || tracking
  });
}
