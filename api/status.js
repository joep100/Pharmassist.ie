/**
 * Delivery status
 *
 * The page posts a tracking number here, this adds the API key and asks
 * Clickacourier where the job is. Same reason as api/booking.js and
 * api/address.js: the key cannot live in the page.
 *
 * Becomes:  POST https://your-site/api/status
 *
 * Body:     { "trackingNumber": "10444780", "shop": "susanhunter" }
 * Returns:  { ok, trackingNumber, status, description, at, events: [...] }
 *
 * Nothing here needs editing. The key comes from CYCLONE_API_KEY in Vercel.
 *
 * The upstream call is GET /BookingStatus/{trackingNumber}/{uuid}, which
 * returns a list of jobs, each with a list of tracking events. We flatten that
 * to the one thing a shop actually wants: the latest event, in plain words.
 */

const BASE = "https://booking-api.cyclonegroup.ie/click_ext";

/* The statuses the API documents, in the order a job passes through them, with
   what a shop should see. Anything unrecognised is shown as it arrives rather
   than hidden, so a new status added at their end is visible rather than
   silently dropped. */
/* The documented statuses, plus the ones the platform actually sends. "accepted"
   is not in the spec but it is the first thing that arrives, so it is here.
   "Booked" would only repeat what the row already says in green, so confirmed
   reports what happens next instead. */
const WORDS = {
  confirmed:        "Waiting for the rider",
  accepted:         "Rider on the way",
  assigned:         "Rider on the way",
  collected:        "Collected",
  picked_up:        "Collected",
  in_progress:      "Rider has it",
  out_for_delivery: "Out for delivery",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
  failed:           "Could not deliver"
};

/* Their event types are not reliable on their own: a collection arrives as
   "complete", which would read as the job being finished. So the words decide,
   and the type is only a fallback.

   The rider's name turns up in the first event and not in later ones, so it is
   carried forward: "James has it" beats "Collected", and a shop ringing about a
   parcel would rather hear a name. */
function driverName(events) {
  for (const e of events) {
    const s = String(e.description || "");
    const m = /\bdriver\s+([A-Z][a-zA-Z'\-]{1,20})/.exec(s) ||
              /\bby\s+([A-Z][a-zA-Z'\-]{1,20})/.exec(s);
    if (m) return m[1];
  }
  return null;
}

function phrase(code, description, name) {
  const s = String(description || "").toLowerCase();
  const who = name || "Rider";

  if (/deliver(ed|y complete)/.test(s))        return name ? "Delivered by " + name : "Delivered";
  if (/collect(ed)?/.test(s))                  return who + " has it";
  if (/on the way to|out for delivery/.test(s)) return who + " is delivering";
  if (/despatch|dispatch|assigned|accepted|on the way/.test(s)) return who + " on the way";
  if (/cancel/.test(s))                        return "Cancelled";
  if (/fail|unable|could not/.test(s))         return "Could not deliver";

  return WORDS[code] || null;
}

const ORDER = ["confirmed", "in_progress", "out_for_delivery", "delivered", "cancelled", "failed"];

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
    return await status(req, res);
  } catch (err) {
    return res.status(500).json({
      error: "The status service hit a problem.",
      detail: String(err && err.stack ? err.stack.split("\n")[0] : err)
    });
  }
};

async function status(req, res) {
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

  /* The uuid this endpoint wants is NOT the one CreateBooking takes, and
     Clickacourier issue one PER CUSTOMER. So the page sends its shop slug and we
     look the uuid up here.

     They live in an environment variable rather than in the page or the shop
     sheet, because anything in either is readable by anyone who looks. Set
     CYCLONE_STATUS_UUIDS in Vercel to a JSON object keyed by slug:

       {"cyclonetest":"46cd...","susanhunter":"91ab...","foleys":"7c4e..."}

     Add a shop by editing that one variable and redeploying. */
  const shop = String(b.shop || "").trim().toLowerCase();

  let uuid = "";
  try {
    const map = JSON.parse(process.env.CYCLONE_STATUS_UUIDS || "{}");
    uuid = String(map[shop] || map["*"] || "").trim();
  } catch (e) {
    return res.status(500).json({
      error: "CYCLONE_STATUS_UUIDS is not valid JSON.",
      detail: "It should look like {\"susanhunter\":\"...\",\"foleys\":\"...\"}"
    });
  }

  if (!tracking) return res.status(400).json({ error: "Need a trackingNumber." });
  if (!shop)     return res.status(400).json({ error: "Need a shop." });
  if (!uuid) {
    return res.status(500).json({
      error: "No status uuid for this shop.",
      detail: "Add \"" + shop + "\" to CYCLONE_STATUS_UUIDS in Vercel, then redeploy."
    });
  }

  /* Both go in the path, so anything odd in them has to be escaped or the URL
     breaks in ways that are hard to see. */
  const url = BASE + "/BookingStatus/" +
    encodeURIComponent(tracking) + "/" + encodeURIComponent(uuid);

  let upstream, text, data = null;
  try {
    upstream = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": key, "Accept": "application/json" }
    });
    text = await upstream.text();
    try { data = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
  } catch (err) {
    return res.status(502).json({
      error: "Could not reach the status service.",
      detail: String(err && err.message ? err.message : err)
    });
  }

  /* A job that does not exist yet is a 404 rather than a failure. That happens
     for a few seconds after booking, and for anything booked in practice mode,
     so it should not look like something went wrong. */
  if (upstream.status === 404) {
    return res.status(200).json({ ok: true, trackingNumber: tracking, status: null,
                                  description: "Not tracking yet", events: [] });
  }

  if (!upstream.ok) {
    return res.status(502).json({
      error: "Cyclone could not give a status.",
      status: upstream.status,
      detail: (data && (data.title || data.detail)) || String(text).slice(0, 300)
    });
  }

  /* One tracking number, so one job; but the shape is a list, and an empty list
     is possible. Flatten every event across whatever came back, newest last. */
  const jobs = (data && data.jobs) || [];
  const events = [];
  for (const j of jobs) {
    for (const t of (j.tracking || [])) {
      events.push({
        type: t.type || "",
        description: t.description || "",
        at: t.trackingTime || null,
        timestamp: t.timestamp || 0
      });
    }
  }
  events.sort((a, b2) => (a.timestamp || 0) - (b2.timestamp || 0));

  /* The latest event by time is usually the current state, but not always: a
     couple can share a timestamp. Fall back to whichever is furthest along the
     documented sequence. */
  let latest = events[events.length - 1] || null;
  for (const e of events) {
    const a = ORDER.indexOf(String(e.type || "").toLowerCase());
    const b3 = ORDER.indexOf(String(latest && latest.type || "").toLowerCase());
    if (a > -1 && a > b3) latest = e;
  }

  const code = String(latest && latest.type || "").toLowerCase();

  /* No events means Clickacourier has the job but nothing has happened to it
     yet. Saying "In progress" there would be a guess wearing a status's clothes,
     so send nothing and let the row stay as it is. */
  return res.status(200).json({
    ok: true,
    trackingNumber: tracking,
    reference: (jobs[0] && jobs[0].booking && jobs[0].booking.reference) || null,
    status: code || null,
    description: events.length
      ? (phrase(code, latest && latest.description, driverName(events)) ||
         (latest && latest.description) || null)
      : null,
    /* the full sentence too, for anywhere with room for it */
    detail: (latest && latest.description) || null,
    at: latest && latest.at,
    events: events
  });
}
