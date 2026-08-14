# Pharmassist site (v2)

Four static pages. No build step, no framework. Open `index.html` in a browser
and it works.

```
index.html          For pharmacies (home)
how-it-works.html   Operational detail
coverage.html       The 12km area and the address checker
for-patients.html   Patient-facing
config.js           the only file you normally need to edit
checker.js          address checker logic, shared by all pages
styles.css          all styling
```

`v1-foleys-frozen/` sits alongside this folder and holds the exact checker file
Foley's received for review. Don't edit it. It's the reference for what they saw.

---

## What changed from v1

v1 was built, then repeatedly patched as the business got clearer. v2 is built
for what the business turned out to be, so the running order changed:

1. **The three ways moved to the top of the home page**, straight after the hero.
   It's the objection-killer. A pharmacist's first silent question is "would this
   even work in my shop", and the answer is always yes.
2. **Cold chain leads the value section** instead of being a caveat buried on
   page two. It's a capability gate: pharmacies dispensing GLP-1 either see it
   early or assume you can't.
3. **The "same day" argument moved into the hero and the section heading.** The
   old version aimed it at the post, which isn't the competitor. The chains
   dispense locally and still don't deliver.
4. **One price, explained.** Deliveries ride scheduled area runs and an area only
   opens when it can carry a run. That's what makes a single number sustainable.
5. **Jargon removed.** "Last mile", "integrate", "asymmetry", "order screen" and
   "template" are gone. The test for anything new: would a pharmacist say this
   word to another pharmacist? "Fridge lines" passes. "Last mile" doesn't.

---

## Before this goes live

Real copy means real claims. **Check each of these and change or delete it.**

**Phone number.** Still `01 000 0000`. It's in `config.js` and hardcoded in the
footer of all four pages, in the checker's out-of-area message, and in `tel:`
links on `for-patients.html`. Replace both the display form and
`tel:+35310000000`.

**Email** is settled as `hello@pharmassist.ie` and consistent throughout.

**The 1pm cutoff** on `how-it-works.html` is invented.

**Proof of delivery.** Claimed as timestamped with the name of whoever took it,
returned the same day.

**Scanning bags in and out** at collection. If it's currently a signature on a
docket, say that instead.

**"If nobody's home we don't leave it."** The right rule for medicines, but
confirm it's yours.

**One price per delivery.** Stated along with the two things that make it work:
scheduled area runs, and areas opening only when they can carry a run. If that's
not how you intend to operate, rewrite it, because a single price with on-demand
collection loses money on every thin pharmacy.

**Fridge lines** are now stated as a capability, since Pharmassist carries
Healthwave's cold chain. The wording stops short of anything unprovable: it says
you pack the cold box to your own procedure and that same-day transit means it
never holds overnight. It does **not** claim validated packaging, temperature
logging, continuous monitoring or GDP certification. If you have any of those,
say so. If not, leave it exactly as written.

**Controlled drugs** are deliberately cautious: "we won't take them on a standard
booking, raise it early". Only strengthen that if the procedures exist.

**CRO number.** Worth adding beside the company name in the footer so a
pharmacist can finish a due-diligence check in one go.

---

## Customer logos

`index.html` shows Healthwave as the anchor customer, currently a placeholder
image. Replace `logo-placeholder-1.png` with their real mark, and get two things
first: written permission to display the logo, and their agreement to take a
reference call, since the line underneath offers one.

**Foley's is not on the site.** A trial being set up is not "delivering with us".
When the trial goes live, add a second `<img>` inside `.clients` and change the
heading from "Healthwave send with us every day" to something covering both, such
as "Dublin pharmacies already delivering with us", and make the sub-line and
reference line plural.

Logos are normalised on **height** (46px), width auto, 200px max, so different
shapes look deliberate. Supply at roughly 140px tall. If one looks smaller than
the other at the same pixel height, nudge it with an inline `style="height:52px"`
rather than changing the shared rule.

---

## The NSAI marks

Both certificates are held by Flexi Logistics Services Ltd., and the site says so
on `index.html`, `how-it-works.html` and in every footer.

**Check the certified scope.** ISO 9001 is certified against a defined scope of
activities. If that scope covers warehousing and general courier work but not
pharmacy delivery, the copy claiming it covers "the way we handle, track and hand
over your bags" is a stretch. Read the certificate.

**Confirm the display conditions** attached to your certificate. Both marks are
placed unaltered, at their own aspect ratio, with no crops, tints or added
borders, which is the conservative reading.

The source files were CMYK JPEGs carrying a 544KB print colour profile each.
They're now greyscale PNGs with the profile stripped: 431KB became 23KB and
13.6KB. The 9001 original was only 200px wide against 831px for the 14001, so
it's upscaled and slightly softer. Worth asking NSAI for the EPS or SVG.

---

## The two forms

Both are wired but post nowhere until you fill in `config.js`:

```js
partnerFormUrl: "https://...",   // pharmacy enquiry form
waitlistUrl:    "https://...",   // out-of-area email capture
```

Anything accepting a JSON POST works: Formspree, Basin, or a Vercel function.
Until set, they still show a thank-you so nobody hits a dead end, but nothing is
sent. Don't ship it that way.

---

## The address checker

The delivery area is a 12km circle around O'Connell Bridge. A routing key (the
first three characters of an Eircode) is an *area*, not a point, so:

- **18 routing keys sit entirely inside** the circle, giving an instant free yes
  from three characters typed.
- **Everything beyond the borderline list sits entirely outside**, giving an
  instant no.
- **8 routing keys are cut through by the circle** (D13, D15, D18, D22, D24, A96,
  K67, K78). These need the full Eircode and a real coordinate lookup.

Roughly 7 in 10 lookups never touch an API.

### Switching on the exact lookup

Put a Google Maps API key in `config.js` and enable **Maps JavaScript API** and
**Geocoding API** on it. Google has carried Eircode data since 2017, so Irish
postcodes geocode accurately.

Without a key, borderline addresses are told to phone you. That's a working
fallback, not a broken state, but it's a worse experience for a chunk of
Tallaght, Blanchardstown, Clondalkin and Dún Laoghaire, which is a lot of people.

### Move the key server-side

A key in a web page can be scraped even with referrer restrictions. The clean fix
is a small Vercel function holding the key, with the browser calling your own
endpoint. That also lets you cache each Eircode you've resolved, so repeat
lookups cost nothing. At minimum, restrict the key to your domain in Google Cloud
Console under *Application restrictions → HTTP referrers*.

---

## Deploying

Push to GitHub, import into Vercel, no build command needed. Plain static files.

Still missing for launch: a real `favicon.ico`. The wordmark is set live in
Inter, all caps per the current logo, with `PHARM` in `#2F8F1C` and `ASSIST` in
`#708090`, and the cross drawn as SVG. Casing is done with CSS `text-transform`
rather than typed in caps, so screen readers say "Pharmassist" instead of
spelling out eleven letters. To use the image file instead, replace the
`<a class="mark">` block with:

```html
<a href="index.html"><img src="pharmassist.png" alt="Pharmassist" width="200"></a>
```
