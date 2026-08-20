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

## Two pharmacies, two files

```
index.html    opens on Foley's Chemist
foodys.html   opens on Foody's Pharmacy
```

Both files are identical apart from one line, `DEFAULT_PHARMACY`. Both know
about every pharmacy, so `?p=` still works on either, but each opens on its own
shop and a bare URL can never book as the wrong one.

Giving each pharmacy its own file rather than one URL with a query string means
you can email it as an attachment, and there's no link for anyone to mangle.

Their lists are kept separately, under `pharmassist:foleys` and
`pharmassist:foodys`, so two pharmacies sharing a machine would never see each
other's bookings.

Bag references are prefixed per shop: `FOL-1`, `FDY-1`.

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

- The **address never appears at all.** The importer resolves it from the
  Eircode, so there's nothing to type and nothing to check.
- **Bags, weight, notes and reference** sit behind an "anything else?" link.
  Almost every prescription is one bag under a kilo, so the defaults are right
  nearly always.

Resist adding fields. Every one is another reason for a busy pharmacist to
decide this is a project rather than a favour.

## Settings worth knowing

All near the top of the script.

| Setting | Now | Notes |
|---|---|---|
| `MODE` | practice | `live` or `practice` |
| `DEFAULT_PHARMACY` | foleys | Used when the URL has no `?p=`. Null once several are live |
| `PHONE` | 01 425 5722 | Pharmassist, shown wherever staff are told to ring us |
| `READY_BY` | 1pm | The parcel-ready time, not the customer order cutoff |
| `SERVICE` | Same Day | Written into every row of the import file |
| `COUNTRY` | Ireland | Always |
| `WEIGHT_MAX` | 4 | kg. Over this and the booking is refused at the counter |
| `COVERED` | `D*`, `A94*`, `A96*`, `K67*` | Matched on the first 3 characters |
| `OUTER` | see script | Rural tails that prompt staff to ring first |
| `NOTES_INTO` | `"company"` | Delivery notes ride in Company Name, moved at import |
| `SEND_URL` | `null` | Set it and a Send button appears |
| `SEND_TO` | bookings@pharmassist.ie | The address shown to staff |
| `NUDGE_FROM` | 12:30 | When the on-screen reminder starts |
| `AUTO_SEND_AFTER_SECS` | 90 | Past 1pm, send unsent bookings this long after the last edit. 0 disables |

## The two confirmations

A complete, covered Eircode shows two ticked lines under the verdict:

1. **We deliver to Terenure.** Inside the 12km area.
2. **Address comes from the Eircode.** An Eircode points at one delivery point,
   apartment and all, so the code gives the exact address.

The second is deliberately worded as what happens, not as something that has
already happened. **This page does not resolve the address**, the importer does,
and claiming otherwise would be a promise the screen can't show. If a pharmacist
ever asked to see the address, there would be nothing there.

If you want the address actually displayed at the counter, that means putting a
lookup back in and paying per booking. Worth doing only if pharmacists say they
don't trust a bare postcode, which is the sort of thing the Foley's session
should tell you.

## There is no address lookup

The importer resolves the address from the Eircode itself, apartments included,
so the booking tool doesn't ask for one and doesn't call any lookup service. No
API key, no per-lookup charge, no caching, nothing to fail mid-booking.

In the import file, **Address Line 1, Adreess Line 2 and Town are sent empty on
purpose.** The Eircode goes in `PostCode` and the importer fills the rest. If that
ever changes, those three columns come back and so does the lookup.

## What it produces

**Download import file** gives you an `.xlsx` matching `blank_multi_import.xlsx`
exactly: same thirteen columns, same order, sheet named `Addresses`, header row
reproduced character for character including the `Adreess Line 2` misspelling.
Don't correct that, the importer may match on it.

Two column notes:

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

## The pharmacy logo

Each pharmacy record takes an optional `logo`. Leave it empty and the name is set
in type instead, which is why this works before you've collected a single logo
file.

Foley's is **inlined as a base64 data URI**, not a separate image file. A
relative path like `logo-foleys.png` breaks the moment the page is opened
anywhere other than its own folder, which is exactly what happens when you email
someone the file to look at. Inlined, it's one self-contained page that works
from a link, an attachment or a memory stick.

It's 138px square, about 11KB inlined, which is 3x the 46px it displays at. To
add another, resize to roughly 138px and paste the data URI in the same way.

## Practice mode

`MODE` at the top of the script is either `"live"` or `"practice"`. It ships as
`"practice"`.

In practice mode:

- An amber banner sits above everything: **nothing here will be delivered**, use
  made-up names.
- The browser tab reads "PRACTICE" so it's obvious even when minimised.
- Every row's Service column becomes `PRACTICE - DO NOT DELIVER`, so a practice
  list can never be mistaken for a real job at your end, even if somebody sends
  it by accident.

**Do not use practice mode with real patients.** Staff will book somebody who is
then expecting a delivery that isn't coming, and nobody will have told the
patient it was a rehearsal. Made-up names only.

Set `MODE = "live"` when you're actually collecting.

**Practice mode with no `SEND_URL` shows the real Send button and goes through
the motions.** Nothing leaves the page, the confirmation says so plainly, and no
network request is made. That lets somebody walk the whole flow, including the
send, before you've set up the sheet.

In live mode a missing `SEND_URL` still falls back to the download button,
because then the list genuinely has to reach you somehow.

### A word on "book as if it were live"

The honest options are a rehearsal with invented patients, or going live with a
small number of real deliveries you actually collect. There isn't a safe middle.

Going live is also the better test. A rehearsal tells you whether the screen
makes sense. It cannot tell you whether staff keep offering delivery once the
shop is busy, and that is the thing most likely to decide whether this works.

## Where the list lands

`apps-script.gs` in this folder is a Google Apps Script endpoint that appends
every booking to a Google Sheet. Free, no server, nothing to host, and about
five minutes to set up. The instructions are at the top of that file.

Why a sheet rather than an emailed file:

- The rows arrive in the same thirteen columns your import template uses, with
  the pharmacy, bag reference and a timestamp in front. Filter to today, select,
  and it goes straight into the importer.
- It accumulates. One sheet is your record across every pharmacy, which is what
  you invoice from, and it answers "did they send anything today" without
  digging through an inbox.
- Nothing to chase. An emailed file has to be found, opened and saved. A sheet
  is already open.

Once it's deployed, paste the web app URL into `SEND_URL` and the Send button
appears in place of the download.

**One technical note.** The page posts as `text/plain`, not `application/json`.
That's deliberate: JSON triggers a CORS preflight that Apps Script doesn't
answer, and the send fails before it arrives. Apps Script parses the body itself,
so nothing is lost. If you swap to a different endpoint later, it needs to accept
`text/plain` or the content type has to change on both sides together.

### If you'd rather have an email

Formspree or Basin both accept a POST and mail it to you, and need no code at
all. You lose the running record and the invoicing view, and you gain an inbox
to keep on top of. For one pharmacy it's fine. For ten it isn't.

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

## The day's list survives a refresh

Bookings are held in `localStorage` on the pharmacy's own machine, keyed by
pharmacy. A stray refresh or a closed tab at ten to one no longer loses a
morning's work, which was the single most likely way for this to fail in
practice.

Three rules keep the patient data side of it honest:

- **Only today.** Anything saved under a different date is discarded and wiped
  on load, so names never linger past the day they were entered.
- **Wiped once sent.** As soon as a list reaches you, the local copy goes.
- **Never blocks the tool.** Private browsing and locked-down machines refuse
  storage outright. Every call is wrapped, and the tool falls back to holding
  the list in the page exactly as it did before.

It's keyed on the resolved pharmacy, not the raw `?p=`, so opening the bare URL
and the `?p=foleys` link on the same machine gives you one list rather than two.

Nothing reaches us until the list is sent.

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
