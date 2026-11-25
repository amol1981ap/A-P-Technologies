// Funnel behaviour: personalised landing, WhatsApp question links, gated data sheet, calculator hand-off, thank-you step.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var num = (cfg.whatsappNumber || '').replace(/\D/g, '');
  var haveWa = /^\d{10,15}$/.test(num);
  var PDF = 'AP-Technologies-GFRP-Rebar-Data-Sheet.pdf';
  function $(s) { return document.querySelector(s); }
  function waLink(t) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(t); }

  // Where the visitor came from.
  var q = new URLSearchParams(window.location.search);
  var utm = { utm_source: '', utm_campaign: '' };
  try {
    ['utm_source', 'utm_campaign'].forEach(function (k) {
      var v = q.get(k);
      if (v) sessionStorage.setItem('cc_' + k, v.slice(0, 80));
      utm[k] = sessionStorage.getItem('cc_' + k) || '';
    });
  } catch (e) {}

  // Landing personalisation: ?use=drainage | sewage | highway | coastal | flooring
  var USES = {
    drainage: { project: 'Drainage', eyebrow: 'GFRP rebars for drainage', h1: 'Drains that outlast<br>the steel.', lead: 'Box drains, storm water channels and RCC gutters in non-corroding GFRP. About a quarter of the weight of steel, so faster to place.' },
    sewage: { project: 'Sewage / STP', eyebrow: 'GFRP rebars for sewage and STP', h1: 'Sewage structures<br>that don’t corrode.', lead: 'STPs, manholes and tanks see aggressive effluent that attacks steel. GFRP does not rust.' },
    highway: { project: 'Highway / NHAI', eyebrow: 'GFRP rebars for highway works', h1: 'Highway reinforcement<br>without rust.', lead: 'Culverts, retaining walls, drains and slabs. We supply test certificates and technical data for your consultant.' },
    coastal: { project: 'Coastal / Marine', eyebrow: 'GFRP rebars for coastal works', h1: 'Built for salt air<br>and sea water.', lead: 'Sea walls, jetties, promenades and coastal-belt buildings, with no chloride-driven corrosion.' },
    flooring: { project: 'Industrial flooring', eyebrow: 'GFRP rebars for industrial flooring', h1: 'Industrial floors,<br>reinforced without rust.', lead: 'Warehouse and factory slabs, trimix flooring and precast, with lightweight bars that are quick to lay.' }
  };
  var use = USES[(q.get('use') || '').toLowerCase()];
  var project = use ? use.project : '';
  if (use) {
    if ($('#hero-eyebrow')) $('#hero-eyebrow').textContent = use.eyebrow;
    if ($('#hero-h1')) $('#hero-h1').innerHTML = use.h1;
    var lead = document.querySelector('.hero .lead'); if (lead) lead.textContent = use.lead;
    var sel = document.querySelector('#enquiry-form select[name="project"]'); if (sel) sel.value = use.project;
    document.title = use.eyebrow + ' | A P Technologies';
  }

  // "Ask on WhatsApp" links.
  document.querySelectorAll('[data-wa="question"]').forEach(function (a) {
    if (!haveWa) { a.hidden = true; return; }
    a.href = waLink('Hello A P Technologies, I have a question about GFRP rebars' + (project ? ' for ' + project.toLowerCase() : '') + '.');
  });

  // Calculator hand-off: carry the result into the enquiry.
  var cta = $('#calc-cta');
  if (cta) cta.addEventListener('click', function () {
    var d = $('#calc-dia'), t = $('#calc-qty'), len = $('#out-len'), qty = document.querySelector('#enquiry-form input[name="qty"]');
    if (qty && !qty.value && d && t && parseFloat(t.value) > 0) qty.value = t.value + ' t steel equivalent, ' + d.value + ' mm (about ' + (len ? len.textContent : '') + ')';
  });

  // Thank-you step after a saved enquiry.
  window.__apThanks = function () {
    var form = $('#enquiry-form'), th = $('#thanks');
    if (!th) return;
    if (form) form.hidden = true;
    th.hidden = false;
    th.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Gated data sheet.
  var dlg = $('#ds-dialog'), dform = $('#ds-form'), dmsg = $('#ds-msg');
  function startDownload() {
    var a = document.createElement('a');
    a.href = PDF; a.download = PDF; document.body.appendChild(a); a.click(); a.remove();
  }
  document.querySelectorAll('[data-datasheet]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      if (dlg && dlg.showModal) { dmsg.textContent = ''; dlg.showModal(); } else { startDownload(); }
    });
  });
  var cancel = $('#ds-cancel');
  if (cancel) cancel.addEventListener('click', function () { dlg.close(); });
  if (dform) dform.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!dform.checkValidity()) { dform.reportValidity(); return; }
    var f = new FormData(dform), btn = dform.querySelector('button[type="submit"]');
    btn.disabled = true; dmsg.textContent = 'Preparing your download…';
    var payload = {
      name: f.get('name'), phone: f.get('phone'), role: f.get('role'), project: project || null,
      message: 'Requested the data sheet (PDF) from the website',
      website_url: f.get('website_url'), utm_source: utm.utm_source, utm_campaign: utm.utm_campaign
    };
    var send = cfg.enquiryUrl
      ? fetch(cfg.enquiryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.enquiryKey || '' }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      : Promise.resolve({ ok: false, d: {} });
    send.then(function (res) {
      if (!res.ok && res.d && res.d.error && /name|phone/i.test(res.d.error)) { dmsg.textContent = res.d.error; return; }
      // Never block the download on a network problem.
      startDownload();
      dmsg.textContent = 'Downloading. We will call to see if you need a quotation.';
      setTimeout(function () { dlg.close(); }, 1800);
    }).catch(function () { startDownload(); dlg.close(); })
      .then(function () { btn.disabled = false; });
  });
})();
