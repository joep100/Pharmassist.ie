# Pharmassist booking

One page. No build step, no framework, no backend. Open `index.html` in a
browser and it works.

## Deploying

Push this folder to GitHub, import the repo into Vercel, accept the defaults.
There's no build command and no output directory to set. It's a static file.

Once it's live, each pharmacy gets its own link to bookmark:

```
https://your-domain/?p=foleys
https://your-domain/?p=healthwave
```

The `?p=` is what identifies the pharmacy. Without it the page shows a picker
instead, which is handy for testing and harmless in daily use, since the shop
name stays visible on screen throughout.

Vercel gives you a working URL straight away, something like
`https://pharmassist-booking.vercel.app/?p=foleys`. That's enough to trial with
Foley's before pointing a real subdomain at it.

## Adding a pharmacy

One entry in `PHARMACIES` near the top of the script. The slug is whatever goes
after `?p=`.

```js
mccauley: {
  name:    "McCauley Pharmacy",
  address: "12 Somewhere Street, Dublin 4",
  eircode: "D04 XXXX",
  phone:   "01 000 0000"
}
```

The address and Eircode are the collection point, sent with the day's list. The
phone is the pharmacy's own, shown on screen so staff can check you hold the
right details. It is deliberately not given to drivers: the driver rings the
customer, then Pharmassist, and Pharmassist rings the pharmacy.

## Labels: there aren't any

The bag gets a reference written on it with a biro. `FOL-1`, `FOL-2`, and so on.
No label printer, no sheets of A4 labels to load and align, nothing to jam
mid-queue.

The bag already carries the pharmacy's own dispensing label with the patient's
name on it. All the driver needs is to know which bag matches which line on his
run, and one number does that.

It's also better for confidentiality: no patient name or address is visible on
the outside of a bag in transit, and only dispatch links the reference to an
address. Worth saying out loud to a pharmacist, because it's the objection
underneath most delivery hesitancy.

The prefix comes from `tag` in the pharmacy's record, so two shops on the same
run never both have a bag 3. Keep it to three letters.

The reference also drops into the `Your Ref (Optional)` column of the import
file, unless the pharmacy typed their own reference, in which case theirs wins.

If a high-volume pharmacy ever wants printed labels, that's a per-pharmacy
addition rather than a default. Don't make everyone carry it.

## Why the form is only two fields

Owner-pharmacists are the ones at the counter, and the received wisdom in the
trade is that delivery is complexity they don't want. So the form asks for the
Eircode, then a name and a mobile. That's it.

Everything else is either derived or hidden:

- The **address comes from the Eircode**, shown as a plain line to confirm
  rather than three boxes to fill.
- **Bags, weight, notes and reference** sit behind an "anything else?" link.
  Almost every prescription is one bag under a kilo, so the defaults are right
  nearly always.
- The **address fields only appear** if the lookup fails, and the page says so.

Resist adding fields. Every one is another reason for a busy pharmacist to
decide this is a project rather than a favour.

## Settings worth knowing

All near the top of the script.

| Setting | Now | Notes |
|---|---|---|
| `PHONE` | 01 425 5722 | Pharmassist, shown wherever staff are told to ring us |
| `READY_BY` | 1pm | The parcel-ready time, not the customer order cutoff |
| `SERVICE` | Same Day | Written into every row of the import file |
| `COUNTRY` | Ireland | Always |
| `WEIGHT_MAX` | 4 | kg. Over this and the booking is refused at the counter |
| `COVERED` | `D*`, `A94*`, `A96*`, `K67*` | Matched on the first 3 characters |
| `OUTER` | see script | Rural tails that prompt staff to ring first |
| `NOTES_INTO` | `"company"` | Delivery notes ride in Company Name, moved at import |
| `LOOKUP_URL` | `"demo"` | Address lookup. See below |
| `SEND_URL` | `null` | Set it and a Send button appears |
| `SEND_TO` | bookings@pharmassist.ie | The address shown to staff |
| `NUDGE_FROM` | 12:30 | When the on-screen reminder starts |
| `AUTO_SEND_AFTER_SECS` | 90 | Past 1pm, send unsent bookings this long after the last edit. 0 disables |

## The address lookup

Currently `"demo"`, which fills the address for three sample Eircodes so you can
see the behaviour. Three real ones to try: `D6W H948`, `D02 X285`, `D08 XR41`.

To make it real, point `LOOKUP_URL` at your own endpoint that holds the API key
and returns:

```json
{ "property": "Flat 2, 14", "street": "Ashfield Park", "area": "Terenure" }
```

Keep the key server-side, and cache each Eircode you resolve. The same patients
reorder every month, so you'd otherwise pay for the same lookup repeatedly.

Autoaddress holds the ECAD and returns the address already split into those
three parts, which maps onto the import columns and gets apartments right.
Google Geocoding is much cheaper but returns one formatted string to pull apart
and is weaker on apartment-level Eircodes.

Set it to `null` and staff type the address, which is how it worked before.

## What it produces

**Download import file** gives you an `.xlsx` matching `blank_multi_import.xlsx`
exactly: same thirteen columns, same order, sheet named `Addresses`, header row
reproduced character for character including the `Adreess Line 2` misspelling.
Don't correct that, the importer may match on it.

Two column notes:

- Staff see the field labelled **Area**, because most Dublin suburbs aren't
  towns. The column stays **Town** because the platform expects it.
- **Company Name (Optional)** carries the delivery instruction, capped at 32
  characters. The tool warns when a note is too long and names which one.

There is no printing and no docket. The driver already knows what he's
collecting, because the list reached dispatch at 1pm, so a piece of paper at the
counter served nobody. The delivery instructions ride in the file, so they don't
need paper either.

One button, and the download only appears as a fallback: when sending isn't set
up, or when a send has just failed.

## Quiet days: no list, no collection

**The standing arrangement is that a collection happens when a list arrives.**
No list by the collection time means nothing to collect, and no driver calls.

That's deliberate. The alternative, a van calling every day regardless, means
someone has to actively signal "nothing today", and they'd have to remember to
do it on precisely the day they have no reason to open the page at all. Silence
is the more reliable signal, and a collection that only happens when there's
something to collect is cheaper to run and reads better to a pharmacy than a
daily call they don't need.

The risk runs the other way instead: staff book six deliveries and forget to
send. That's what the red nudge after the collection time is for, and it's the
one failure worth watching in the first fortnight.

Say this plainly when a pharmacy signs up, because it's part of what you're
promising. It's on the page too, under the list, so counter staff see it.

## Getting the list at 1pm

The page can't email on a schedule. It's a browser tab, and at 1pm it may be
closed, locked or refreshed, so nothing on a timer would be reliable. Anything
scheduled has to run on a server.

What it does instead:

- **A nudge from 12:30**, going amber, then red once the collection time passes
  if bookings still haven't been sent. It's a reminder, not a mechanism, which
  is why nothing depends on it.
- **A Send button**, if `SEND_URL` is set, posting the day's list as JSON.
- **Automatic sending past the collection time.** Anything still unsent goes on
  its own, `AUTO_SEND_AFTER_SECS` (90) after the last edit, so a booking
  half-typed at 12:59 isn't sent mid-sentence. Late additions send themselves
  too. Needs `SEND_URL`, and needs the tab still open.
- Otherwise staff download the file and email it to whatever `SEND_TO` says.

The auto-send is the part that actually catches the mistake. A reminder relies
on the same person remembering, which is the thing that failed. Set
`AUTO_SEND_AFTER_SECS` to 0 to turn it off and go back to the button alone.

A failed send doesn't mark anything as sent, so it retries on the next tick and
the red nudge stays up.

The real deadline is the driver arriving. A person is already scheduled to be
there at one o'clock, and they'll notice if the list isn't ready. That's more
reliable than any cron job.

### If you want it fully automatic

Two ways, both needing a small backend:

**Post as you go.** Each booking is sent the moment it's added, your server
holds the day's rows and a scheduled job emails the compiled file at 1pm. Most
robust: if the tab is closed at noon, everything added before then is already
safe. The cost is that you're storing patient names for a few hours, so
same-day deletion and a processing agreement apply.

**Email each booking as it's added.** No storage, no scheduled job, no state.
You get six emails instead of one file, which is untidy but has no data
retention question attached at all.

For a single-pharmacy trial, the button is enough. Revisit it when there are
several pharmacies and chasing lists becomes someone's afternoon.

## Data

Nothing is stored. The list lives in the page and is gone on refresh, which is
deliberate: patient names and mobiles shouldn't sit in a browser overnight. The
footer tells staff to download before they finish up.

If you ever want the list to survive a refresh, that belongs server-side, not in
browser storage.

## Still open

- Whether 4kg is per booking or per bag. Treated here as per booking, since the
  column is Total Weight.
- Whether the site's "we don't leave bags" line should soften, given this tool
  lets a patient authorise it.
- A single-row test upload through your import tool before Foley's start.
