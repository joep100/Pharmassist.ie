/* api/track.js — the public status lookup.
 *
 * Answers with a stage and nothing else. Not the driver, not the signer, not
 * the address, not the shop. That is what lets this sit on a page with no sign
 * in and no second factor: somebody guessing a reference learns that a parcel
 * somewhere is on a van, which tells them nothing about anyone.
 *
 * Do not add detail to this endpoint without thinking that through again.
 * Clickacourier's own descriptions carry the driver's first name and the
 * signer's name, so they must never be passed through as they come.
 *
 * Uses the global tracking endpoint, which resolves any Cyclone booking from
 * its reference alone. An earlier version tried each shop's uuid in turn and so
 * could only find the five shops' jobs; everything else came back as not found.
 */

const BASE = "https://booking-api.cyclonegroup.ie/click_ext";

const STAGE = { none: 0, onway: 1, collected: 2, atbase: 3, outfor: 4, done: 5, bad: 6 };

/* Type first, where Clickacourier give one - it is documented and stable.
   Description second, because the types do not cover collection, return to
   base or a failed delivery. */
function reach(ev) {
  const type = String(ev.type || "").toLowerCase();
  if (type === "delivered")                      return STAGE.done;
  if (type === "outfordelivery")                 return STAGE.outfor;
  if (type === "intransit")                      return STAGE.onway;
  /* ARRIVAL means the rider reached one end or the other. Which end is only in
     the description, so it never advances the stage on its own. */

  const s = String(ev.description || "").toLowerCase();
  if (/cancel|fail|unable|refus/.test(s))        return STAGE.bad;
  if (/deliver(ed)?|signed by/.test(s))          return STAGE.done;
  if (/returned to base|back to base/.test(s))   return STAGE.atbase;
  if (/collect(ed)?|picked up/.test(s))          return STAGE.collected;
  if (/despatch|dispatch|assigned|accepted|on the way/.test(s)) return STAGE.onway;
  return null;
}

function readEvents(events) {
  /* Returned newest first, so sort rather than trusting the order. */
  const sorted = events.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  let stage = STAGE.none, at = null, seenBase = false;
  for (const e of sorted) {
    let r = reach(e);
    /* A collection after a return to base is the second leg going out. */
    if (r === STAGE.collected && seenBase) r = STAGE.outfor;
    if (r === STAGE.atbase) seenBase = true;
    /* Only ever forward: a late event for an earlier leg cannot drag a
       delivered parcel back to collected. */
    if (r !== null && r > stage) { stage = r; at = e.trackingTime || null; }
    else if (r !== null && r === stage) { at = e.trackingTime || at; }
  }
  return { stage, at };
}

function wordFor(stage) {
  switch (stage) {
    case STAGE.done:      return "Delivered";
    case STAGE.outfor:    return "Out for delivery";
    case STAGE.atbase:    return "On the way";
    case STAGE.collected: return "Collected";
    case STAGE.onway:     return "On the way";
    case STAGE.bad:       return "Could not be delivered";
    default:              return "Booked";
  }
}

export default async function handler(req, res) {
  /* A minute of caching: enough to blunt somebody refreshing, short enough that
     a customer watching for a delivery sees it change. */
  res.setHeader("Cache-Control", "public, max-age=60");

  /* The widget runs on other people's sites, so the browser will not let it
     read this answer unless we say so. Open to any origin, which is right here
     and only here: no credentials, nothing about the caller, one word back.
     Do not copy this onto status.js, which does carry names. */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const ref = String((req.query && req.query.ref) || "").replace(/[^0-9]/g, "").slice(0, 12);
  if (!ref) return res.status(400).json({ ok: false, error: "no reference" });

  /* TEMPORARY: &debug=1 reports what the upstream actually said, so a "not
     found" can be told apart from a key problem or a timeout. No customer data
     - a status code and whether each key is present. Remove once settled. */
  const debug = (req.query && req.query.debug) === "1";

  const apiKey   = process.env.CYCLONE_API_KEY;
  const trackKey = process.env.CYCLONE_TRACKING_KEY;
  if (!apiKey || !trackKey) {
    console.error("track: missing CYCLONE_API_KEY or CYCLONE_TRACKING_KEY");
    return res.status(500).json({ ok: false, error: "not configured" });
  }

  const url = BASE + "/BookingStatus/" + encodeURIComponent(ref);

  /* The API calls the courier platform upstream, so it can be slow. One retry
     on a 5xx, nothing on a 404 - that answer will not change. */
  const notes = [];
  let r = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctl = (typeof AbortSignal !== "undefined" && AbortSignal.timeout)
        ? AbortSignal.timeout(20000) : undefined;
      r = await fetch(url, {
        method: "GET",
        headers: { "X-API-Key": apiKey, "X-Tracking-Key": trackKey, "Accept": "application/json" },
        signal: ctl
      });
      notes.push("attempt " + attempt + ": http " + r.status);
    } catch (e) {
      notes.push("attempt " + attempt + ": threw " + String(e && e.message || e).slice(0, 90));
      r = null;
      if (attempt) break;
      continue;
    }
    if (r.status === 404) { notes.push("404 from upstream"); break; }
    if (r.status === 400 || r.status === 401) { notes.push("auth refused"); break; }
    if (r.ok) break;
    if (attempt) break;
    await new Promise(s => setTimeout(s, 600));
  }

  if (debug) {
    return res.status(200).json({
      debug: true,
      notes: notes,
      url: url,
      hasApiKey: !!apiKey, apiKeyLength: apiKey ? apiKey.length : 0,
      hasTrackingKey: !!trackKey, trackingKeyLength: trackKey ? trackKey.length : 0,
      bodyStart: r && r.ok ? (await r.clone().text()).slice(0, 180) : null
    });
  }

  if (!r)                                   return res.status(200).json({ ok: false, status: "Not found" });
  if (r.status === 404)                     return res.status(200).json({ ok: false, status: "Not found" });
  if (r.status === 400 || r.status === 401) {
    console.error("track: auth refused, status " + r.status);
    return res.status(500).json({ ok: false, error: "not configured" });
  }
  if (!r.ok)                                return res.status(200).json({ ok: false, status: "Not found" });

  let d = null;
  try { d = await r.json(); } catch { return res.status(200).json({ ok: false, status: "Not found" }); }

  /* { jobs: [ { tracking: [...] } ] }, and a split job has several entries. */
  const evs = [];
  for (const j of (d && d.jobs) || []) {
    for (const e of (j.tracking || [])) evs.push(e);
  }

  /* No events means the job exists and nothing has happened to it yet, which is
     most of them between the booking and the collection. Saying "nothing on
     that number" there would be wrong, and would worry the very customer most
     likely to be looking. */
  const st = readEvents(evs);
  return res.status(200).json({
    ok: true,
    status: wordFor(st.stage),
    at: st.at || null
  });
}
