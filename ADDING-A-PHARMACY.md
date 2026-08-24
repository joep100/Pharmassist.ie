# Adding a pharmacy

Three edits. About five minutes.

`index.html` is the landing page; `booking.html` is the tool itself.

There is **one copy of the tool**, `index.html`, serving every pharmacy. Nothing
is duplicated and nothing is branched, so a fix lands for everyone at once.

---

## 1. Add them to `index.html`

Near the top of the script, find `const PHARMACIES = {` and add an entry:

```js
mccauleys: {
  tag:"MCC",                          // goes on the bag: MCC-1, MCC-2
  logo:"",                            // leave empty and their name is set in type
  name:"McCauley Pharmacy",
  address:"12 Somewhere Street, Dublin 4",
  eircode:"D04 XXXX",
  phone:"01 000 0000"
},
```

The key on the left (`mccauleys`) becomes their web address, so keep it short,
lower case, no spaces.

**`tag` must be unique.** It goes on the bag, so two pharmacies sharing one
would put `FOL-1` on two different bags on the same run. The page checks for
this and complains in the browser console if it finds a clash, but it is easier
to just pick a distinct one.

## 2. Add them to the landing page

In `index.html`, find `const SHOPS` near the bottom and add a line, so staff can
find their link if the bookmark goes missing:

```js
{ slug:"mccauleys", name:"McCauley Pharmacy", where:"Somewhere Street, Dublin 4" },
```

## 3. Add them to `vercel.json`

```json
{ "source": "/mccauleys", "destination": "/booking.html" }
```

Commit both. Their link is then:

```
https://your-site/mccauleys
```

---

## Their price

Optional. Leave it out and they get the default in `PRICE` near the top of the
script, currently 9.95. To give one shop a volume rate without touching anyone
else:

```js
price: 5.50,
```

Staff see it twice: beside the Add button as "9.95 for this delivery", and as a
running total on the day's list, "3 bookings, 29.85". That total is what they
will be invoiced, so it is worth being right.

**The rate is copied onto each booking as it is made**, not looked up later. So
changing a shop's price tomorrow cannot quietly rewrite what today's list came
to, and the figure on their screen always matches the figure on the invoice.

This is what the shop pays us. What they charge the customer is their business:
add it to the bill, absorb it, or split it.

## Their same day cutoff

Optional. Leave it out and they get midday, which suits a pharmacy: they have to
dispense before the van comes.

A shop that only has to take something off a shelf needs no such lead time, so
it can go later:

```js
sameDayUntil: 14,      // 2pm
```

**The cutoff protects the delivery, not the collection.** A late collection in
the city centre is easy. Getting that parcel to Blanchardstown by five is not.
So push it out where the shop is central *and* its customers are, and leave it
at midday otherwise.

The wording follows automatically: staff see "ordered before 2pm" rather than
"before midday", and the tool tells them what to promise based on the time right
now.

## Adding their logo

Optional, and it works fine without one. Leave `logo` empty and their name is
set in type instead.

Put the image in the `logos` folder and point at it:

```js
logo:"/logos/mccauleys.png",
```

Square, about 216 pixels, PNG. Get their written permission before displaying it.

Logos are files rather than embedded in the page on purpose. Embedded, every
pharmacy downloads every other pharmacy's logo on every visit: two logos already
came to 72KB of a 114KB page, and twenty would have been most of a megabyte.
As files, each shop fetches only its own and the page stays around 40KB.

---

## Why not a separate file or branch per pharmacy

Both look tidier and both go wrong.

**A file each** means every fix has to be pasted into every file. We had exactly
that with `foodys.html` for a day, and it had to be regenerated after every
single change.

**A branch each** is worse. Branches are for work that eventually merges back.
Ten pharmacies would mean ten merges for every fix, and they would drift apart
within a fortnight. The first time one pharmacy got a bug fix the others didn't,
you would not find out from the code, you would find out from a phone call.

One file, one deployment, one place to look.

---

## Which pharmacy a page thinks it is

Read from the address, in this order:

1. `?p=foleys` if present, which is handy for testing
2. otherwise the path, so `/foleys` works
3. otherwise `DEFAULT_PHARMACY`

**Set `DEFAULT_PHARMACY` to null once you have more than two pharmacies.** With a
default, somebody opening the bare address books as whichever shop it names. The
name is on screen throughout and travels with every list, so a mistake would be
visible rather than silent, but it is better not to allow it at all.
