/**
 * Eircode lookup
 *
 * The pharmacy's page cannot call Cyclone directly, because the API key would
 * be sitting in the page for anyone to read and use. So the page calls this
 * instead, and this holds the key.
 *
 * Vercel turns any file in an /api folder into a live web address on its own.
 * This one becomes:   https://your-site/api/address?eircode=D02X285
 *
 * Nothing here needs editing. The key comes from a Vercel setting called
 * CYCLONE_API_KEY, which is explained in the README.
 */

const BASE = "https://booking-api.cyclonegroup.ie/click_ext";

module.exports = async function handler(req, res) {
  // Read the eircode from the web address. req.query is a convenience Vercel
  // provides in some setups and not others, so read the raw URL if it's absent
  // rather than crashing.
  let raw = "";
  try {
    if (req.query && req.query.eircode) {
      raw = String(req.query.eircode);
    } else {
      const u = new URL(req.url, "http://localhost");
      raw = u.searchParams.get("eircode") || "";
    }
  } catch (e) {
    raw = "";
  }
  const eircode = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (eircode.length !== 7) {
    return res.status(400).json({ error: "An Eircode is seven characters." });
  }

  const key = process.env.CYCLONE_API_KEY;
  if (!key) {
    // Deployed without the setting. Say so plainly rather than failing oddly.
    return res.status(500).json({ error: "CYCLONE_API_KEY is not set in Vercel." });
  }

  try {
    const upstream = await fetch(
      BASE + "/SelectEircodeAddress/" + encodeURIComponent(eircode),
      { headers: { "X-API-Key": key, "Accept": "application/json" } }
    );

    // Cyclone returns 404 when there's no exact match. That's a normal answer,
    // not a failure: the pharmacist just types the address instead.
    if (upstream.status === 404) {
      return res.status(200).json({ found: false });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: "Address service unavailable." });
    }

    let a = await upstream.json();

    // SelectEircodeAddress hands back a placeId and a locality, not a street.
    // The full address sits behind the placeId, so fetch that too. If this
    // second call fails we still return what we have rather than nothing.
    if (a && a.placeId) {
      try {
        const detail = await fetch(
          BASE + "/SelectAddress/" + encodeURIComponent(a.placeId),
          { headers: { "X-API-Key": key, "Accept": "application/json" } }
        );
        if (detail.ok) {
          const d = await detail.json();
          if (d && (d.addressLine1 || d.city)) a = Object.assign({}, a, d);
        }
      } catch (e) {
        // keep the locality-only answer
      }
    }

    // The same Eircode gets looked up every month by the same patients, so let
    // Vercel keep each answer for a day. Costs nothing and takes load off the API.
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");

    return res.status(200).json({
      found: true,
      placeId: a.placeId || null,      // needed later, when this also creates the booking
      line1:   a.addressLine1 || "",
      line2:   a.addressLine2 || "",
      line3:   a.addressLine3 || "",
      city:    a.city || "",
      county:  a.county || "",
      postalCode: a.postalCode || ""
    });

  } catch (err) {
    // Report what went wrong. Without this a failure is a blank 500 page and
    // there is nothing to go on.
    return res.status(502).json({
      error: "Could not reach the address service.",
      detail: String(err && err.message ? err.message : err)
    });
  }
};
