# v1 — the copy given to Foley's for review

**Do not edit anything in this folder.** This is the exact file Foley's received.
It exists so there is always a known reference for what they saw, whatever
changes afterwards.

- File: `pharmassist-delivery-checker-v1.html`
- Frozen: 14 August 2026
- Checksum (sha256, first 16): `a56667d19c438c7c`
- Status: review copy only, not in front of patients

## Known placeholders in this version

These are fine for a review copy but must be fixed before any version goes in
front of a patient:

1. **Phone is `01 000 0000`.** Appears in the footer, in the out-of-area
   message, and as the fallback for the eight borderline routing keys. Without a
   Google key, patients in Tallaght, Clondalkin, Blanchardstown, D13, D18 and
   Dún Laoghaire are all sent to that number.
2. **`waitlistUrl` is null.** Out-of-area emails show a thank-you and are
   silently discarded.
3. **`orderUrl` is `#order`.** The green button does nothing.
4. **Wordmark is lowercase**, predating the revised all-caps logo.

## What it does correctly

- Answers instantly and free for the 18 routing keys wholly inside the 12km
  circle, and for everything wholly outside it.
- Refuses honestly on the 8 borderline keys rather than guessing.
- Catches typos and suggests corrections (letters Eircode never uses).
