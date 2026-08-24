/**
 * Create a booking
 *
 * The page posts here, this adds the API key and talks to Cyclone. Same reason
 * as api/address.js: the key cannot live in the page, where anyone could read it
 * and book on our account.
 *
 * Becomes:  POST https://your-site/api/booking
 *
 * Nothing here needs editing. The key comes from CYCLONE_API_KEY in Vercel.
 */

const BASE = "https://booking-api.cyclonegroup.ie/click_ext";

/** "yyyy-MM-dd hh:mm:ss" in Dublin local time, which is what the API expects. */
function stamp(d) {
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":00";
}

/**
 * Read the posted body whatever shape it arrives in. Vercel parses some content
 * types and not others, and hands back a string, an object or nothing at all
 * depending on the runtime. Reading the stream ourselves covers every case.
 */
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
  // Everything is wrapped: a crash gives a bare 500 with nothing to go on,
  // which is no use to anyone standing at a counter.
  try {
    return await book(req, res);
  } catch (err) {
    return res.status(500).json({
      error: "The booking service hit a problem.",
      detail: String(err && err.stack ? err.stack.split("\n")[0] : err)
    });
  }
};

async function book(req, res) {
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
    return res.status(400).json({
      error: "Could not read the booking.",
      detail: String(e && e.message ? e.message : e)
    });
  }

  // Everything the API insists on. Better to say which one is missing than to
  // let Cyclone reject it with something less obvious.
  const missing = ["collection", "delivery", "account", "uuid", "caller"]
    .filter(f => !b[f]);
  if (missing.length) {
    return res.status(400).json({ error: "Missing: " + missing.join(", ") });
  }

  /* When the bag will be ready. Before the shop's cutoff it's today at the
     collection hour; after it, tomorrow. The page works out which and sends
     `tomorrow`, because only the page knows that shop's cutoff. */
  const ready = new Date();
  if (b.tomorrow) ready.setDate(ready.getDate() + 1);
  ready.setHours(Number(b.readyHour || 13), 0, 0, 0);

  const booking = {
    caller:          String(b.caller).slice(0, 60),
    collection:      b.collection,
    delivery:        b.delivery,
    account:         b.account,
    uuid:            b.uuid,
    vehicle:         b.vehicle || "BIKE",
    service:         b.service || "STANDARD",
    goodsDescription: b.goodsDescription || "Sealed bag",
    numberOfItems:   Number(b.numberOfItems || 1),
    totalWeight:     Number(b.totalWeight || 1),
    collectionTime:  stamp(ready),
    collectionName:  b.collectionName || "",
    collectionPhone: b.collectionPhone || "",
    deliveryName:    b.deliveryName || "",
    deliveryPhone:   b.deliveryPhone || "",
    reference:       b.reference || "",
    notes:           b.notes || ""
  };

  if (b.deliverySubAddressLine) booking.deliverySubAddressLine = b.deliverySubAddressLine;

  /* ------------------------------------------------------------------
     CreateBooking will not take a booking on its own: it wants a quoteId,
     even though the published spec lists that field as optional. So the
     order is quote first, then book against it.

     CreateQuote returns several options, one per vehicle. We pick the one
     matching the vehicle asked for, and fall back to the first if there is
     no match, because a quote for the wrong bike still beats no booking.
     ------------------------------------------------------------------ */
  let quote = null;
  try {
    const q = await fetch(BASE + "/CreateQuote", {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        account: booking.account,
        uuid: booking.uuid,
        fromPlaceId: booking.collection,
        toPlaceId: booking.delivery
      })
    });
    const qtext = await q.text();
    let qdata = null;
    try { qdata = qtext ? JSON.parse(qtext) : null; } catch (e) { /* not JSON */ }

    const quotes = (qdata && qdata.quotes) || [];
    if (!q.ok || !quotes.length) {
      return res.status(502).json({
        error: "Cyclone could not quote for that journey.",
        status: q.status,
        detail: (function(){
          const m = qdata && (qdata.error_messages || qdata.errorMessages);
          if (Array.isArray(m) && m.length) return m.join("; ");
          return (qdata && (qdata.title || qdata.detail)) || qtext.slice(0, 300);
        })(),
        reply: qdata || qtext.slice(0, 1200)
      });
    }

    const want = String(booking.vehicle || "").toUpperCase();
    quote = quotes.find(function (x) {
      const n = String((x.vehicle && (x.vehicle.name || x.vehicle.type)) || "").toUpperCase();
      return n.replace(/[^A-Z]/g, "") === want.replace(/[^A-Z]/g, "");
    }) || quotes[0];

  } catch (err) {
    return res.status(502).json({
      error: "Could not reach the quoting service.",
      detail: String(err && err.message ? err.message : err)
    });
  }

  booking.quoteId = quote.uid;

  try {
    const upstream = await fetch(BASE + "/CreateBooking", {
      method: "POST",
      headers: {
        "X-API-Key": key,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(booking)
    });

    const text = await upstream.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }

    if (!upstream.ok) {
      // Pass the whole reply back. A validation error names the offending field
      // somewhere in there, and guessing which key it lives under wastes more
      // time than sending the lot.
      return res.status(502).json({
        error: "Cyclone refused the booking.",
        status: upstream.status,
        detail: (function(){
                  const m = data && (data.error_messages || data.errorMessages);
                  if (Array.isArray(m) && m.length) return m.join("; ");
                  return (data && (data.title || data.detail || data.message)) || text.slice(0, 300);
                })(),
        sent: booking,
        reply: data || text.slice(0, 1500)
      });
    }

    if (data && data.success === false) {
      const msgs = data.error_messages || data.errorMessages;
      return res.status(502).json({
        error: "Cyclone refused the booking.",
        detail: Array.isArray(msgs) && msgs.length ? msgs.join("; ") : "No reason given.",
        reply: data
      });
    }

    return res.status(200).json({
      ok: true,
      trackingNumber: (data && (data.tracking_number || data.trackingNumber ||
                                data.TrackingNumber)) || null,
      collectionTime: booking.collectionTime,
      quoteId: quote.uid,
      quotedVehicle: (quote.vehicle && (quote.vehicle.name || quote.vehicle.type)) || null,
      distanceMetres: quote.distance || null,
      raw: data
    });

  } catch (err) {
    return res.status(502).json({
      error: "Could not reach the booking service.",
      detail: String(err && err.message ? err.message : err)
    });
  }
}
