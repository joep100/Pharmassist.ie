# Message templates for partner pharmacies

Nothing here needs new software. These are drop-in replacements for messages
your pharmacy already sends, with one extra line.

**Fill in the placeholders:** `[PHARMACY]`, `[PRICE]`, `[CUTOFF]`, `[TRACKING]`,
`[PHONE]`.

---

## The rule that matters most

**Offer delivery when they order, not when it's ready.**

If the offer goes out with the "ready to collect" message, the yes arrives after
dispensing at an unpredictable hour. A patient told at 3pm who replies at five
has missed the cutoff, and the bag is already on the collection shelf.

Offered at order time instead: the pharmacy knows before it dispenses, the
patient has already paid, and the day's deliveries are known early enough to be
grouped by direction rather than chased one at a time.

---

## 1. On the phone

The most important one, because for most pharmacies this is where the offer
actually happens. A person asking converts far better than any link. It just has
to get asked.

**When they ring to order, or when you ring to say it's ready:**

> "That'll be ready this afternoon. Do you want to collect, or will I have it
> dropped out to you? It's [PRICE] and it'd be with you today."

That's it. Two options, one price, no explanation unless they ask.

**If they ask who delivers it:**

> "A courier we use, Pharmassist. We seal your bag here as normal and they hand
> it to you at the door."

**If they say yes:**

> "Grand, I'll put it on your bill. You'll get a message when it's on the way."

Whatever you charge for delivery goes on the patient's bill like anything else,
or into the price so nothing is said at all. Pharmassist bills the pharmacy, so
there's nothing to collect at the door and no link to send.

**Worth taping beside the phone.** The wording matters less than the offer being
made every single time, which is the part that quietly stops happening in week
three.

---

## 2. Order-time offer by message

The important one. Goes out on the order confirmation, replacing whatever you
send now.

**SMS** (fits one segment)

> [PHARMACY]: order received. Collect in store, or have it delivered to your
> door today for [PRICE]. Reply YES for delivery.

**Push notification**

> Title: Order received
> Body: Collect in store, or get it delivered today for [PRICE].

**Email**

> Subject: Your order at [PHARMACY]
>
> We've received your order and we'll let you know as soon as it's ready.
>
> **Want it brought to you instead?**
> We deliver across Dublin the same day for [PRICE]. Order before [CUTOFF] and
> it reaches you today.
>
> Just reply to this email and we'll sort it.
>
> Nothing changes about how your order is prepared. Delivery is handled by
> Pharmassist, a courier we work with. Your bag is sealed here before it leaves
> and is handed to you in person.

---

## 3. Confirmed for delivery

Sent once they've paid, so they aren't left wondering.

**SMS**

> [PHARMACY]: delivery booked. We'll prepare your order and text you when it's
> on the way. Any questions, call us on [PHONE].

---

## 4. On its way

Replaces "ready to collect" for delivery patients.

**SMS**

> [PHARMACY]: your order is on its way and should reach you this afternoon.
> Someone needs to be there to take it. Track: [TRACKING]

**Push**

> Title: On its way
> Body: Your order has left the pharmacy. Someone will need to accept it.

---

## 5. Delivered

**SMS**

> [PHARMACY]: your order was delivered and signed for. Anything at all about
> your medicine, call us on [PHONE].

---

## 6. Nobody home

Because the bag comes back rather than being left.

**SMS**

> [PHARMACY]: we called with your order but couldn't hand it over, so it's back
> with us and safe. Call [PHONE] to arrange another time or collect in store.

---

## Rules for every message

**Never name the medication.** Texts and push notifications surface on lock
screens where other people can read them. "Your order" is enough. This is a
patient-confidentiality point and a good reason for the pharmacy to keep control
of the wording.

**The pharmacy is always the sender.** Messages come from you, not from
Pharmassist. The patient's relationship is with their pharmacy, and every
message should reinforce that.

**Clinical questions go to the pharmacy.** Every message ends with your number,
never ours. Ours is only for "where is my bag".

**Say someone has to accept it.** Setting the expectation early avoids the
failed delivery, which costs everyone.

**Keep SMS to one segment.** Under 160 characters or you pay twice per message.
The templates above are within it.

---

## Count the offers, not just the orders

The one number that decides whether the pilot worked.

If the pharmacy sends four deliveries a day, that could be forty patients asked
and four saying yes, or four patients asked and all four saying yes. Those are
completely different results and only one of them is a problem. From the courier
side both look identical.

So keep a tally at the counter for the first fortnight. A sheet by the phone with
two columns is enough:

| Date | Offered | Accepted |
|------|---------|----------|
|      |         |          |

**Roughly what it means:**

- **Low offered, high accepted.** Patients want it, staff aren't asking. Fixable,
  and the best possible result to find. Retrain, re-tape the script to the phone.
- **High offered, low accepted.** The offer is being made and declined. Look at
  the price, the wording, or whether the catchment simply walks in anyway.
- **Low offered, low accepted.** No signal at all yet. Don't draw conclusions.

Without this you'll spend the review arguing about demand when the answer is
that nobody asked.
