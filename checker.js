/* ==========================================================================
   PHARMASSIST address checker

   Drop <div data-checker></div> anywhere and this builds the whole thing.
   Optional attributes:
     data-audience="patient"   changes the wording to speak to a patient
                               (the default speaks to pharmacy staff)
     data-cta="/for-patients"  where the green button goes on a yes

   HOW IT DECIDES
   The delivery area is a 12km circle. A routing key (the first 3 characters
   of an Eircode) is an AREA, not a point, so for most of Dublin the routing
   key answers the question on its own, but for 8 of them the circle cuts
   straight through the middle. Hence two paths:

     FAST: 18 routing keys are wholly inside, everything else wholly
             outside. Answered from the list in config.js. Free, instant,
             works from 3 characters. Roughly 7 in 10 lookups.
     EXACT: for the 8 borderline keys, look up the real coordinates of the
             full Eircode and measure the actual distance.
   ========================================================================== */

(function(){
  "use strict";

  var C = window.PHARMASSIST;
  if(!C) return;

  /* Eircodes only use these characters. B, G, I, J, L, M, O, Q, S, U and Z are
     deliberately left out so nothing gets misread, which is handy for typos. */
  var LETTERS = "ACDEFHKNPRTVWXY";
  var SWAPS = {O:"0",Q:"0",I:"1",L:"1",J:"1",S:"5",Z:"2",B:"8",G:"6",U:"V"};

  var CROSS =
    '<svg class="verdict__icon" viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect class="up" x="24.5" y="4" width="15" height="56" rx="2.5" fill="currentColor"/>' +
      '<rect x="4" y="24.5" width="56" height="15" rx="2.5" fill="currentColor"/>' +
    '</svg>';

  /* ---------- reading what was typed ---------- */
  function readEircode(raw){
    var up = String(raw || "").toUpperCase();
    var m = up.match(/\b(D6W|[ACDEFHKNPRTVWXY][0-9]{2})[ -]?([ACDEFHKNPRTVWXY0-9]{4})\b/);
    return m ? m[1] + m[2] : up.replace(/[^A-Z0-9]/g, "");
  }
  function routingKeyOf(code){
    var rk = code.slice(0,3);
    if(rk === "D6W") return rk;
    if(rk.length === 3 && LETTERS.indexOf(rk[0]) > -1 && /^[0-9]{2}$/.test(rk.slice(1))) return rk;
    return null;
  }
  function suggestFix(code){
    var fixed = code.split("").map(function(c){ return SWAPS[c] || c; }).join("");
    return fixed !== code ? fixed : null;
  }
  function pretty(code){
    return code.length > 3 ? code.slice(0,3) + " " + code.slice(3) : code;
  }

  /* ---------- straight-line distance in km ---------- */
  function distanceKm(a, b){
    var r = function(d){ return d * Math.PI / 180; };
    var dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    var h = Math.pow(Math.sin(dLat/2),2) +
            Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.pow(Math.sin(dLng/2),2);
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  /* ---------- Google Maps, loaded only if a borderline lookup is needed ---------- */
  var mapsReady = null;
  function loadMaps(){
    if(mapsReady) return mapsReady;
    mapsReady = new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = "https://maps.googleapis.com/maps/api/js?key=" +
              encodeURIComponent(C.googleApiKey) + "&loading=async";
      s.async = true;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error("maps failed")); };
      document.head.appendChild(s);
    });
    return mapsReady;
  }

  /* ======================================================================
     One checker instance
     ====================================================================== */
  function build(host){
    var patient = host.getAttribute("data-audience") === "patient";
    var ctaUrl  = host.getAttribute("data-cta") || (patient ? "#" : "#partner");
    var id      = "chk" + Math.random().toString(36).slice(2,7);
    var lastLookedUp = "";

    host.className = "checker";
    host.innerHTML =
      '<label class="checker__label" for="' + id + '">' +
        (patient ? "Your Eircode" : "Patient\u2019s Eircode") +
      '</label>' +
      '<div class="checker__field">' +
        '<input id="' + id + '" type="text" inputmode="text" autocomplete="postal-code" ' +
               'spellcheck="false" maxlength="8" placeholder="D02 X285">' +
        '<button class="checker__go" type="button">Check</button>' +
      '</div>' +
      '<p class="checker__hint">' +
        (patient
          ? 'Not sure of yours? <a href="https://www.eircode.ie" target="_blank" rel="noopener">Find it on eircode.ie</a>'
          : 'Answers instantly for most of Dublin. No account needed.') +
      '</p>' +
      '<div class="checker__out" hidden aria-live="polite"></div>';

    var input = host.querySelector("input");
    var out   = host.querySelector(".checker__out");

    function show(state, heading, html){
      out.hidden = false;
      out.className = "checker__out is-" + state;
      out.innerHTML =
        '<hr class="checker__rule"><div class="verdict">' + CROSS +
        '<div class="verdict__body"><h3>' + heading + '</h3>' + html + '</div></div>';
    }

    function yes(area){
      show("yes",
        area ? "Yes, we cover " + area
             : (patient ? "Yes, you\u2019re in our delivery area"
                        : "Yes, that address is in range"),
        '<div class="note-good">' + C.promise + '</div>' +
        '<a class="btn btn--solid btn--sm" href="' + ctaUrl + '">' +
          (patient ? "What happens next" : "Become a partner pharmacy") +
        '</a>');
    }

    function no(area){
      var where = area ? area : "that area";
      show("no",
        patient ? "We\u2019re not in " + where + " yet"
                : "That address is outside our range",
        '<p>' + (patient
          ? "We\u2019re adding new areas all the time. Leave your email and we\u2019ll tell you the moment we reach you."
          : "We don\u2019t cover " + where + " today. Leave your email and we\u2019ll let you know when we do. We\u2019re expanding steadily.") +
        '</p>' +
        '<div class="catch">' +
          '<input type="email" placeholder="you@example.com" aria-label="Email address">' +
          '<button type="button">Notify me</button>' +
        '</div>' +
        '<p class="tiny" style="margin-top:14px">Something urgent? Call us on ' +
          '<a href="tel:' + C.phoneLink + '">' + C.phone + '</a>.</p>');
      wireCatch();
    }

    function ringUs(area){
      show("no", "Right on the edge of our range",
        '<p>' + (area || "That area") + ' is partly inside our 12km range and partly ' +
        'outside it, so we can\u2019t call it from the Eircode alone.</p>' +
        '<p class="tiny">Ring us on <a href="tel:' + C.phoneLink + '">' + C.phone +
        '</a> and we\u2019ll confirm in seconds.</p>');
    }

    function wireCatch(){
      var box = out.querySelector(".catch input");
      var btn = out.querySelector(".catch button");
      if(!btn) return;
      btn.onclick = function(){
        var email = (box.value || "").trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
          box.focus(); box.style.borderColor = "var(--red)"; return;
        }
        btn.disabled = true; btn.textContent = "Saving\u2026";
        var done = function(){
          box.parentElement.outerHTML =
            '<div class="note-good">Thanks, we\u2019ll be in touch as soon as ' +
            'we\u2019re delivering there.</div>';
        };
        if(!C.waitlistUrl){ done(); return; }
        fetch(C.waitlistUrl, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ email: email, eircode: readEircode(input.value) })
        }).then(done).catch(done);   /* thank them either way */
      };
    }

    /* ---------- the actual check ---------- */
    function check(){
      var code = readEircode(input.value);
      if(code.length < 3){ out.hidden = true; lastLookedUp = ""; return; }

      var rk = routingKeyOf(code);

      if(!rk){
        var fix = suggestFix(code);
        show("err", "That doesn\u2019t look like an Eircode",
          '<div class="note-bad">An Eircode is seven characters, like ' +
          '<span class="code">D02 X285</span>.' +
          (fix ? ' Did you mean <span class="code">' + pretty(fix) + '</span>?' : '') +
          '</div>' +
          '<p class="tiny" style="margin-top:14px">Look one up on ' +
          '<a href="https://www.eircode.ie" target="_blank" rel="noopener">eircode.ie</a>.</p>');
        return;
      }

      var area = C.areas[rk] || null;

      /* fast path: wholly inside */
      if(C.inside.indexOf(rk) > -1){ yes(area); return; }

      /* fast path: nowhere near */
      if(C.borderline.indexOf(rk) < 0){ no(area); return; }

      /* borderline: needs the full code */
      if(code.length < 7){
        show("more", "Nearly there",
          '<p>' + (area || "That area") + ' sits right on the edge of our range, so we ' +
          'need the full Eircode, just the last four characters.</p>');
        return;
      }

      if(!C.googleApiKey){ ringUs(area); return; }
      if(code === lastLookedUp) return;
      lastLookedUp = code;

      show("busy", "Checking that address\u2026", "<p>One moment.</p>");
      measure(code, area);
    }

    function measure(code, area){
      loadMaps().then(function(){
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { address: pretty(code), componentRestrictions: { country: "IE" } },
          function(results, status){
            if(status !== "OK" || !results || !results.length){ ringUs(area); return; }
            var r = results[0];
            /* a loose match means we don't actually know, so don't guess */
            if(r.partial_match === true || r.geometry.location_type === "APPROXIMATE"){
              ringUs(area); return;
            }
            var km = distanceKm(C.centre, {
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng()
            });
            if(km <= C.radiusKm) yes(area); else no(area);
          }
        );
      }).catch(function(){
        ringUs(area);   /* key wrong, quota gone, API down: never leave them stuck */
      });
    }

    input.addEventListener("input", function(){
      var bare = input.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7);
      input.value = pretty(bare);
      if(bare.length >= 3) check();
    });
    input.addEventListener("keydown", function(e){ if(e.key === "Enter") check(); });
    host.querySelector(".checker__go").onclick = check;
  }

  /* ---------- mount every checker on the page ---------- */
  document.querySelectorAll("[data-checker]").forEach(build);

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector(".nav__toggle");
  if(toggle){
    toggle.onclick = function(){
      document.querySelector(".nav__links").classList.toggle("is-open");
    };
  }

  /* ---------- partner form ---------- */
  var form = document.querySelector("[data-partner-form]");
  if(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var data = Object.fromEntries(new FormData(form).entries());
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
      var done = function(){
        form.innerHTML =
          '<div class="note-good" style="grid-column:1/-1">Thanks, we\u2019ve got ' +
          'that. Someone will come back to you within one working day.</div>';
      };
      if(!C.partnerFormUrl){ done(); return; }
      fetch(C.partnerFormUrl, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(data)
      }).then(done).catch(function(){
        btn.disabled = false;
        btn.textContent = "Try again";
      });
    });
  }

})();
