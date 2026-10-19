/* Cyclone delivery tracking — a pop-up for any page.
 *
 *   <script src="https://book.cyclone.ie/cyclone-track-widget.js"><\/script>
 *
 * (the closing tag above is written with a backslash so that this file can also
 * be pasted inline into a page - a literal closing script tag inside a comment
 * ends the script there and everything after it becomes page text.)
 *
 * That alone puts a small button in the bottom right. To use your own button
 * instead, add data-no-button to the script tag and call cycloneTrack() from
 * whatever you like:
 *
 *   <script src="..." data-no-button><\/script>
 *   <a href="#" onclick="cycloneTrack(); return false;">Track a delivery</a>
 *
 * Everything lives in a shadow root, so the host page's CSS cannot reach in and
 * this cannot leak out. Dropping it onto a site built by somebody else should
 * change nothing about how that site looks.
 */
(function () {
  if (window.cycloneTrack) return;                 /* already on the page */

  var script = document.currentScript;
  var API    = (script && script.getAttribute('data-api')) || '/api/track';
  var PHONE  = (script && script.getAttribute('data-phone')) || '01 425 5722';
  var NOBTN  = script && script.hasAttribute('data-no-button');

  var host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483000';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  root.innerHTML = [
    '<style>',
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:"Nunito",system-ui,-apple-system,sans-serif}',

    '.launch{position:fixed;right:18px;bottom:18px;background:#17191b;color:#fff;',
    '  border:0;border-radius:13px;padding:13px 20px;font-size:15px;font-weight:800;',
    '  cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2),0 12px 28px -12px rgba(0,0,0,.4)}',
    '.launch:hover{background:#000;color:#FFCC00}',
    '.launch[hidden]{display:none}',

    '.veil{position:fixed;inset:0;background:rgba(10,10,10,.55);display:none;',
    '  align-items:center;justify-content:center;padding:20px}',
    '.veil.on{display:flex}',

    '.box{background:#fff;border-radius:18px;padding:26px 26px 22px;width:100%;',
    '  max-width:400px;position:relative;',
    '  box-shadow:0 20px 60px -20px rgba(0,0,0,.5)}',
    '.x{position:absolute;top:12px;right:12px;background:none;border:0;font-size:24px;',
    '  line-height:1;color:#9a9c90;cursor:pointer;padding:6px 10px}',
    '.x:hover{color:#17191b}',

    'h2{margin:0 0 18px;font-size:23px;font-weight:800;letter-spacing:-.02em;color:#17191b}',
    'label{display:block;font-size:11.5px;font-weight:800;letter-spacing:.1em;',
    '  text-transform:uppercase;color:#9a9c90;margin-bottom:8px}',
    'input{width:100%;border:1.5px solid rgba(23,25,27,.16);border-radius:12px;',
    '  padding:14px 16px;font-family:ui-monospace,Menlo,monospace;font-size:19px;',
    '  letter-spacing:.07em;color:#17191b;background:#fff}',
    'input:focus{outline:none;border-color:#17191b}',
    '.go{width:100%;margin-top:12px;background:#17191b;color:#fff;border:0;',
    '  border-radius:12px;padding:15px;font-size:16px;font-weight:800;cursor:pointer}',
    '.go:hover{background:#000;color:#FFCC00}',
    '.go[disabled]{opacity:.5;cursor:default}',

    '.out{margin-top:18px;padding:18px 20px;border-radius:12px;background:#17191b;color:#fff}',
    '.out[hidden]{display:none}',
    '.out b{display:block;font-size:22px;font-weight:800;letter-spacing:-.02em;',
    '  color:#FFCC00;margin-bottom:3px}',
    '.out span{display:block;font-size:14px;color:rgba(255,255,255,.8);',
    '  font-family:system-ui,sans-serif}',
    '.out.miss{background:#FFF3C4;color:#17191b}',
    '.out.miss b{color:#17191b;font-size:18px}',
    '.out.miss span{color:#6b5a2a}',

    '.foot{margin:16px 0 0;font-size:13px;color:#8a6a2a;text-align:center;',
    '  font-family:system-ui,sans-serif}',
    '.foot a{color:inherit;font-weight:700}',
    '</style>',

    '<button class="launch" part="launch">Track a delivery</button>',
    '<div class="veil"><div class="box" role="dialog" aria-modal="true" aria-label="Track a delivery">',
    '  <button class="x" aria-label="Close">&times;</button>',
    '  <h2>Track a delivery</h2>',
    '  <label for="r">Job number</label>',
    '  <input id="r" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="11097627">',
    '  <button class="go">Check</button>',
    '  <div class="out" hidden></div>',
    '  <p class="foot">Something not right? Ring <a href="tel:' + PHONE.replace(/\s/g, '') + '">' + PHONE + '</a>.</p>',
    '</div></div>'
  ].join('');

  var launch = root.querySelector('.launch');
  var veil   = root.querySelector('.veil');
  var box    = root.querySelector('.box');
  var input  = root.querySelector('#r');
  var go     = root.querySelector('.go');
  var out    = root.querySelector('.out');

  if (NOBTN) launch.hidden = true;

  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var t = d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false });
    return d >= t0 ? 'at ' + t + ' today'
                   : 'on ' + d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) + ', ' + t;
  }

  function show(cls, head, sub) {
    out.className = 'out' + (cls ? ' ' + cls : '');
    out.innerHTML = '<b></b><span></span>';
    out.querySelector('b').textContent = head;
    out.querySelector('span').textContent = sub || '';
    out.hidden = false;
  }

  function check() {
    var v = (input.value || '').replace(/[^0-9]/g, '');
    if (!v) { input.focus(); return; }
    go.disabled = true;
    show('miss', 'Checking\u2026', '');
    fetch(API + '?ref=' + encodeURIComponent(v))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        go.disabled = false;
        if (d && d.ok) show('', d.status, when(d.at));
        /* A wrong number and one with nothing on it yet get the same answer, so
           nobody can work out which numbers exist. */
        else show('miss', 'Nothing on that number',
                  'Check the digits. A booking made in the last few minutes may not be on yet.');
      })
      .catch(function () {
        go.disabled = false;
        show('miss', 'Could not check just now', 'Try again in a moment, or ring ' + PHONE + '.');
      });
  }

  function open(ref) {
    veil.classList.add('on');
    out.hidden = true;
    if (ref) { input.value = String(ref).replace(/[^0-9]/g, ''); check(); }
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() { veil.classList.remove('on'); }

  launch.addEventListener('click', function () { open(); });
  root.querySelector('.x').addEventListener('click', close);
  veil.addEventListener('click', function (e) { if (e.target === veil) close(); });
  box.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && veil.classList.contains('on')) close();
  });
  go.addEventListener('click', check);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });

  window.cycloneTrack = open;

  /* A link can open it straight onto a job: ...?track=11097627 */
  var q = new URLSearchParams(location.search).get('track');
  if (q) open(q);
})();
