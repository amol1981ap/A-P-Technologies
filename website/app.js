(function () {
  var cfg = window.SITE_CONFIG || {};
  var dias = cfg.diameters || [6, 8, 10, 12, 16, 20, 25, 32];

  // Weight per metre (kg/m) from nominal diameter in mm.
  // Steel: d²/162 (standard). GFRP: area × ~2,100 kg/m³ (typical density).
  function steelKgPerM(d) { return (d * d) / 162; }
  function gfrpKgPerM(d) { return Math.PI / 4 * d * d * 1e-6 * 2100; }
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
      var gT = metres * gfrpKgPerM(d) / 1000;
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
      var payload = {
        name: f.get('name'), phone: f.get('phone'), company: f.get('company'), role: f.get('role'),
        project: f.get('project'), location: f.get('location'), qty: f.get('qty'), message: f.get('message'),
        website_url: f.get('website_url')
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

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
