/* api/track.js — the public version of the status lookup.
 *
 * The same call to Clickacourier as api/status.js, and the same reading of the
 * event descriptions, but it answers with a stage and nothing else.
 *
 * Nothing it returns identifies anybody. Not the driver, not the signer, not
 * the address, not the shop. That is what lets this sit on a page with no sign
 * in and no second factor: somebody guessing a reference learns that a parcel
 * somewhere is on a van, which tells them nothing about anyone.
 *
 * Do not add detail to this endpoint without thinking that through again. Every
 * extra field is a field a stranger can read.
 */

const API = "https://api.clickacourier.com";

/* Keyed by slug, same variable the shop status lookup uses. Any one of them can
 * be asked about any of its own jobs; the account is inferred from the number
 * rather than supplied, so a caller cannot choose which account to search. */
function accounts() {
  try { return JSON.parse(process.env.CYCLONE_STATUS_UUIDS || "{}"); }
  catch { return {}; }
}

const STAGE = { none: 0, onway: 1, collected: 2, atbase: 3, outfor: 4, done: 5, bad: 6 };

/* Read the descriptions, not the event types - the types proved unreliable. */
function readEvents(events) {
  let stage = STAGE.none, at = null, seenBase = false;
  for (const e of events || []) {
    const s = String(e.description || "").toLowerCase();
    let reached = null;

    if (/cancel|fail|unable|refus/.test(s))                      { reached = STAGE.bad; }
    else if (/deliver(ed)?|signed by/.test(s))                   { reached = STAGE.done; }
    else if (/returned to base|back to base/.test(s))            { reached = STAGE.atbase; seenBase = true; }
    else if (/collect(ed)?|picked up/.test(s))                   { reached = seenBase ? STAGE.outfor : STAGE.collected; }
    else if (/despatch|dispatch|assigned|accepted|on the way/.test(s)) { reached = STAGE.onway; }

    /* Only ever forward: a late event for an earlier leg cannot drag a
       delivered parcel back to collected. */
    if (reached !== null && reached > stage) { stage = reached; at = e.at || null; }
    else if (reached === stage) { at = e.at || at; }
  }
  return { stage, at };
}

/* Four words, and no names. The shop-facing version says "James has it" and
   "Signed by Joe"; neither belongs on a page anyone can open. */
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
  res.setHeader("Cache-Control", "no-store");

  const ref = String((req.query && req.query.ref) || "").replace(/[^0-9]/g, "").slice(0, 12);
  if (!ref) return res.status(400).json({ ok: false, error: "no reference" });

  const uuids = Object.values(accounts());
  if (!uuids.length) return res.status(500).json({ ok: false, error: "not configured" });

  const key = process.env.CYCLONE_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: "not configured" });

  /* Try each account until one recognises the number. A caller cannot say which
     account to look in, so they cannot use this to probe a particular shop. */
  for (const uuid of uuids) {
    try {
      const r = await fetch(API + "/BookingStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ uuid, trackingNumber: ref })
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (!d || !d.events || !d.events.length) continue;

      const st = readEvents(d.events);
      return res.status(200).json({
        ok: true,
        status: wordFor(st.stage),
        at: st.at || null
        /* and nothing else */
      });
    } catch { /* try the next account */ }
  }

  /* The same answer whether the number is wrong or simply has no events yet.
     Telling the two apart would let somebody map which numbers exist. */
  return res.status(200).json({ ok: false, status: "Not found" });
}
