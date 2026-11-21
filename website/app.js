(function () {
  var cfg = window.SITE_CONFIG || {};
  var dias = cfg.diameters || [8, 10, 12, 16, 18, 20, 22, 24];

  // Weight per metre (kg/m) from nominal diameter in mm.
  // Steel: d²/162 (standard). GFRP: manufacturer's table; sand-coated bars are 0.010 kg/m heavier.
  function steelKgPerM(d) { return (d * d) / 162; }
  var WT = { 8: 0.105, 10: 0.158, 12: 0.23, 16: 0.41, 18: 0.506, 20: 0.625, 22: 0.756, 24: 0.9 };
  function gfrpKgPerM(d) { return WT[d] || Math.PI / 4 * d * d * 1e-6 * 2000; }
  function sandKgPerM(d) { return gfrpKgPerM(d) + 0.01; }
  function fmt(n, dp) { return n.toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: dp }); }

  // Size table
  var tbody = document.getElementById('size-table');
  if (tbody) {
    tbody.innerHTML = dias.map(function (d) {
      return '<tr><td>' + d + ' mm</td><td>' + fmt(gfrpKgPerM(d), 3) + '</td><td>' + fmt(steelKgPerM(d), 3) + '</td><td>' + (cfg.standardLength || '') + '</td></tr>';
    }).join('');
  }

  // Calculator
  var sel = document.getElementById('calc-dia');
  var qty = document.getElementById('calc-qty');
  if (sel && qty) {
    sel.innerHTML = dias.map(function (d) { return '<option value="' + d + '"' + (d === 12 ? ' selected' : '') + '>' + d + ' mm</option>'; }).join('');
    var outLen = document.getElementById('out-len');
    var outG = document.getElementById('out-gfrp');
    var outS = document.getElementById('out-save');
    function calc() {
      var d = parseFloat(sel.value);
      var t = parseFloat(qty.value);
      if (!(t > 0)) { outLen.textContent = outG.textContent = outS.textContent = '—'; return; }
      var metres = (t * 1000) / steelKgPerM(d);
      var gT = metres * sandKgPerM(d) / 1000; // sand-coated: the heavier, so the saving shown is not overstated
      outLen.textContent = fmt(Math.round(metres), 0) + ' m';
      outG.textContent = fmt(gT, 2) + ' tonnes';
      outS.textContent = fmt(t - gT, 2) + ' tonnes (' + Math.round((1 - gT / t) * 100) + '%)';
    }
    sel.addEventListener('change', calc);
    qty.addEventListener('input', calc);
    calc();
  }

  // WhatsApp enquiry
  var num = (cfg.whatsappNumber || '').replace(/\D/g, '');
  function waLink(text) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text); }
  var footerWa = document.getElementById('footer-wa');
  if (footerWa && /^\d{10,15}$/.test(num)) footerWa.href = waLink('Hello A P Technologies, I would like to know more about GFRP rebars.');

  var form = document.getElementById('enquiry-form');
  var msg = document.getElementById('form-msg');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var f = new FormData(form);
      var lines = [
        'New GFRP enquiry (website)',
        'Name: ' + f.get('name'),
        'Phone: ' + f.get('phone'),
        f.get('company') ? 'Company: ' + f.get('company') : null,
        'Role: ' + f.get('role'),
        'Project: ' + f.get('project'),
        f.get('location') ? 'Location: ' + f.get('location') : null,
        f.get('qty') ? 'Quantity: ' + f.get('qty') : null,
        f.get('message') ? 'Message: ' + f.get('message') : null
      ].filter(Boolean).join('\n');
      var calcNote = (sel && qty && parseFloat(qty.value) > 0) ? 'Calculator: ' + sel.value + ' mm, ' + qty.value + ' t steel' : '';
      var payload = {
        name: f.get('name'), phone: f.get('phone'), company: f.get('company'), role: f.get('role'),
        project: f.get('project'), location: f.get('location'), qty: f.get('qty'), message: [f.get('message'), calcNote].filter(Boolean).join(' | '),
        website_url: f.get('website_url'),
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign
      };
      var haveWa = /^\d{10,15}$/.test(num);
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      msg.textContent = 'Sending…';
      var saved = false;
      var send = cfg.enquiryUrl
        ? fetch(cfg.enquiryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: cfg.enquiryKey || '' },
            body: JSON.stringify(payload)
          }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        : Promise.resolve({ ok: false, d: {} });
      send.then(function (res) {
        saved = res.ok;
        if (!res.ok && res.d && res.d.error && res.d.error.indexOf('phone') !== -1) { msg.textContent = res.d.error; return; }
        if (haveWa) window.open(waLink(lines), '_blank', 'noopener');
        msg.textContent = saved
          ? 'Thank you. We have your enquiry' + (haveWa ? ' and are opening WhatsApp.' : ' and will call you soon.')
          : (haveWa ? 'Opening WhatsApp…' : 'Could not send. Please try again.');
      }).catch(function () {
        if (haveWa) window.open(waLink(lines), '_blank', 'noopener');
        msg.textContent = haveWa ? 'Opening WhatsApp…' : 'Could not send. Please try again.';
      }).then(function () { btn.disabled = false; });
    });
  }

  // Remember where the visitor came from (utm_source / utm_campaign on ad and post links).
  var utm = { utm_source: '', utm_campaign: '' };
  try {
    var q = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_campaign'].forEach(function (k) {
      var v = q.get(k);
      if (v) sessionStorage.setItem('cc_' + k, v.slice(0, 80));
      utm[k] = sessionStorage.getItem('cc_' + k) || '';
    });
  } catch (e) {}

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
