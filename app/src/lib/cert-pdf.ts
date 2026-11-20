import { formatDate, formatNum } from './calc';
import type { CompanySettings, Despatch, Order, Party } from './database.types';
import type { TestWithValues } from './tests-queries';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type CertLine = { name: string; metres: number; batch_no: string | null };

export function certificateHtml(a: { company: CompanySettings; party: Party | null; despatch: Despatch; order: Order | null; lines: CertLine[]; tests: TestWithValues[] }) {
  const { company: c, party: p, despatch: d, order: o } = a;
  const batches = [...new Set(a.lines.map((l) => l.batch_no).filter((b): b is string => !!b))];

  const sections = batches
    .map((b) => {
      const tests = a.tests.filter((t) => t.test.batch_no === b);
      const lines = a.lines.filter((l) => l.batch_no === b);
      const body = tests.length
        ? tests
            .map(
              (t) => `<div class="meta">Tested ${formatDate(t.test.tested_on)}${t.test.lab ? ` · ${esc(t.test.lab)}` : ''}${t.test.report_no ? ` · Report ${esc(t.test.report_no)}` : ''}</div>
        <table><thead><tr><th>Property</th><th class="r">Result</th><th>Unit</th><th>Requirement</th></tr></thead><tbody>
        ${t.values.map((v) => `<tr><td>${esc(v.property)}</td><td class="r"><strong>${esc(v.value)}</strong></td><td>${esc(v.unit)}</td><td>${esc(v.requirement) || '—'}</td></tr>`).join('')}
        </tbody></table>${t.test.notes ? `<div class="meta">${esc(t.test.notes)}</div>` : ''}`,
            )
            .join('')
        : '<div class="none">No test result has been recorded for this batch.</div>';
      return `<h2>Batch ${esc(b)}</h2><div class="meta">${lines.map((l) => `${esc(l.name)}: ${formatNum(l.metres, 2)} m`).join(' · ')}</div>${body}`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1E242B;margin:0;padding:32px;font-size:12px;line-height:1.5}
  h1{font-size:22px;margin:0 0 2px} h2{font-size:14px;margin:22px 0 4px;color:#1F5C46}
  .top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #1F5C46;padding-bottom:12px}
  .muted{color:#5B636B} .meta{color:#5B636B;margin:2px 0 6px} .r{text-align:right} .right{text-align:right;white-space:nowrap}
  table{width:100%;border-collapse:collapse;margin-bottom:6px} th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#5B636B;text-align:left;padding:6px 4px;border-bottom:1px solid #D9D4CB}
  th.r{text-align:right} td{padding:7px 4px;border-bottom:1px solid #EFEDE8}
  .none{background:#F6E6DD;color:#8A4321;border-radius:8px;padding:10px 12px;margin-top:6px}
  .note{font-size:10px;color:#5B636B;margin-top:14px}
</style></head><body>
  <div class="top">
    <div><h1>${esc(c.name)}</h1>
      ${c.works_address ? `<div class="muted"><strong>Works:</strong> ${esc(c.works_address)}</div>` : ''}
      ${c.office_address ? `<div class="muted"><strong>Office:</strong> ${esc(c.office_address)}</div>` : ''}
      ${c.gstin ? `<div class="muted">GSTIN ${esc(c.gstin)}</div>` : ''}</div>
    <div class="right"><div style="font-size:18px;font-weight:700">TEST CERTIFICATE</div><div>Despatch ${esc(d.number)}</div>${d.delivered_at || d.created_at ? `<div class="muted">${formatDate(d.delivered_at ?? d.created_at)}</div>` : ''}</div>
  </div>
  <h2 style="margin-top:14px">Supplied to</h2>
  <div><strong>${esc(p?.name)}</strong></div>
  ${o?.po_number ? `<div class="muted">PO ${esc(o.po_number)}</div>` : ''}
  ${o?.site_address ? `<div class="muted">${esc(o.site_address)}</div>` : ''}
  <div class="muted">Product: GFRP rebar</div>
  ${sections}
  <div class="note">Results are as recorded from the tests named above. This certificate lists only the batches in this despatch.</div>
  <div class="right" style="margin-top:28px">For <strong>${esc(c.name)}</strong><br><br><br>Authorised signatory</div>
</body></html>`;
}
