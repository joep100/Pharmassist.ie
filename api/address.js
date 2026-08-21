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
 * CYCLONE_API_KEY.
 */

const BASE = "https://booking-api.cyclonegroup.ie/click_ext";

/** First value with something in it, trying each name in turn. */
function pick(obj, names) {
  if (!obj) return "";
  for (let i = 0; i < names.length; i++) {
    const v = obj[names[i]];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

/**
 * Turn whatever came back into one readable address.
 *
 * Two things make this messier than it should be. The API answers in
 * snake_case while the published schema says camelCase, so both are read. And
 * the street arrives in company_name while address_line1 holds the postal
 * district, so the field names can't be trusted: everything with content is
 * collected in order and duplicates dropped.
 */
function toAddress(a) {
  const parts = [
    pick(a, ["company_name", "companyName"]),
    pick(a, ["address_line1", "addressLine1"]),
    pick(a, ["address_line2", "addressLine2"]),
    pick(a, ["address_line3", "addressLine3"]),
    pick(a, ["city"]),
    pick(a, ["county"])
  ];

  // The same place often appears twice, e.g. Clonsilla as both line 2 and city.
  const seen = {};
  const lines = parts.filter(function (v) {
    if (!v) return false;
    const k = v.toLowerCase();
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });

  const postal = pick(a, ["postal_code", "postalCode"]);
  const eircode = postal
    ? postal.replace(/\s+/g, "").replace(/^(.{3})(.{4})$/, "$1 $2")
    : "";

  return {
    address: lines.join(", ") + (eircode ? ", " + eircode : ""),
    lines: lines,
    postalCode: eircode,
    placeId: pick(a, ["placeId", "place_id"]) || null,
    latitude: a.latitude || null,
    longitude: a.longitude || null
  };
}

module.exports = async function handler(req, res) {
  // Read the eircode from the web address. req.query is a convenience Vercel
  // provides in some setups and not others, so fall back to the raw URL.
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
    return res.status(500).json({ error: "CYCLONE_API_KEY is not set in Vercel." });
  }

  const headers = { "X-API-Key": key, "Accept": "application/json" };

  try {
    const first = await fetch(
      BASE + "/SelectEircodeAddress/" + encodeURIComponent(eircode),
      { headers: headers }
    );

    // 404 means no exact match. That's a normal answer, not a failure: the
    // pharmacist simply doesn't see an address and carries on.
    if (first.status === 404) {
      return res.status(200).json({ found: false });
    }
    if (!first.ok) {
      return res.status(502).json({ error: "Address service unavailable." });
    }

    let data = await first.json();
    let out = toAddress(data);

    // If the first call gave a placeId but little else, ask for the detail
    // behind it. Merged field by field so an empty value can never wipe a good
    // one, which is how the placeId went missing on an earlier attempt.
    if (out.placeId && out.lines.length < 2) {
      try {
        const second = await fetch(
          BASE + "/SelectAddress/" + encodeURIComponent(out.placeId),
          { headers: headers }
        );
        if (second.ok) {
          const detail = await second.json();
          if (detail) {
            Object.keys(detail).forEach(function (k) {
              const v = detail[k];
              if (v !== null && v !== undefined && v !== "") data[k] = v;
            });
            const merged = toAddress(data);
            if (merged.lines.length >= out.lines.length) out = merged;
          }
        }
      } catch (e) {
        // keep what the first call gave us
      }
    }

    // The same patients reorder monthly, so let Vercel keep each answer a day.
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");

    return res.status(200).json({
      found: true,
      address: out.address,
      lines: out.lines,
      postalCode: out.postalCode,
      placeId: out.placeId,
      latitude: out.latitude,
      longitude: out.longitude
    });

  } catch (err) {
    return res.status(502).json({
      error: "Could not reach the address service.",
      detail: String(err && err.message ? err.message : err)
    });
  }
};
