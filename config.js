/* ==========================================================================
   PHARMASSIST CONFIG
   This is the only file you need to edit for day-to-day changes.
   ========================================================================== */

window.PHARMASSIST = {

  /* ---- contact ---- */
  phone:     "01 000 0000",          /* CONFIRM */
  phoneLink: "+35310000000",         /* CONFIRM: digits only, with country code */
  email:     "hello@pharmassist.ie",

  /* ---- the delivery promise shown when an address is in range ---- */
  promise: "Collected from your counter and with the patient the same day.",
  cutoff:  "1pm",                    /* CONFIRM the real booking cutoff */

  /* ---- where forms post to ----
     Leave as null and the form shows a thank-you without sending anywhere.
     Formspree, Basin, or a Vercel function all work. See README.md.       */
  partnerFormUrl: null,
  waitlistUrl:    null,

  /* ======================================================================
     DELIVERY AREA: a 12km circle around O'Connell Bridge
     ====================================================================== */
  centre:   { lat: 53.3474, lng: -6.2591 },
  radiusKm: 12,

  /* Google Maps key, used only for the 8 borderline routing keys below.
     Leave "" and those callers are asked to phone instead.
     A key in a web page is public, so restrict it to your domain in Google
     Cloud Console, or move it server-side (see README.md).                */
  googleApiKey: "",

  /* Routing keys sitting ENTIRELY inside the 12km circle.
     Answered instantly, free, from the first 3 characters typed. */
  inside: [
    "D01","D02","D03","D04","D05","D06","D6W","D07","D08","D09",
    "D10","D11","D12","D14","D16","D17","D20","A94"
  ],

  /* Routing keys the circle CUTS THROUGH: part in, part out.
     These need the full Eircode and a real coordinate lookup. */
  borderline: ["D13","D15","D18","D22","D24","A96","K67","K78"],

  /* Everything not listed above is treated as outside the area. */

  /* Place names, so the site says "Rathmines" rather than "D06" */
  areas: {
    D01:"Dublin 1", D02:"Dublin 2", D03:"Clontarf and Fairview", D04:"Dublin 4",
    D05:"Raheny and Artane", D06:"Rathmines and Ranelagh",
    D6W:"Terenure and Templeogue", D07:"Phibsborough and Cabra", D08:"Dublin 8",
    D09:"Drumcondra and Glasnevin", D10:"Ballyfermot", D11:"Finglas",
    D12:"Crumlin and Walkinstown", D13:"Baldoyle and Portmarnock",
    D14:"Dundrum and Churchtown", D15:"Blanchardstown and Castleknock",
    D16:"Ballinteer and Knocklyon", D17:"Coolock", D18:"Sandyford and Foxrock",
    D20:"Palmerstown", D22:"Clondalkin", D24:"Tallaght",
    A94:"Blackrock", A96:"D\u00fan Laoghaire and Dalkey", A98:"Bray",
    K32:"Balbriggan", K34:"Skerries", K36:"Lusk", K45:"Rush",
    K56:"Donabate", K67:"Swords", K78:"Lucan and Celbridge",
    W23:"Maynooth", A83:"Ashbourne"
  }
};
