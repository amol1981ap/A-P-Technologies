import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { formatDate, formatInr, formatNum, gfrpKgPerM, lineGst, lineTaxable, steelKgPerM, totals } from './calc';
import type { CompanySettings, Party, Quote } from './database.types';

export type PdfItem = { name: string; diameter_mm: number; metres: number; rate_per_m: number; gst_percent: number };

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl = (s: string | null | undefined) => esc(s).replace(/\n/g, '<br>');

export function quoteHtml(args: { company: CompanySettings; party: Party | null; quote: Quote; items: PdfItem[] }) {
  const { company: c, party: p, quote: q, items } = args;
  const t = totals(items);

  const rows = items
    .map(
      (i, n) => `<tr>
        <td>${n + 1}</td><td>GFRP rebar, ${esc(i.name)}</td>
        <td class="r">${formatNum(i.metres, 2)}</td><td class="r">${formatInr(i.rate_per_m)}</td>
        <td class="r">${formatInr(lineTaxable(i))}</td><td class="r">${i.gst_percent}%</td><td class="r">${formatInr(lineTaxable(i) + lineGst(i))}</td></tr>`,
    )
    .join('');

  const compare = items
    .map((i) => {
      const steelT = (i.metres * steelKgPerM(i.diameter_mm)) / 1000;
      const gfrpT = (i.metres * gfrpKgPerM(i.diameter_mm)) / 1000;
      return `<tr><td>${i.diameter_mm} mm</td><td class="r">${formatNum(i.metres, 0)} m</td>
        <td class="r">${formatNum(steelT, 2)} t</td><td class="r">${formatNum(gfrpT, 2)} t</td>
        <td class="r">${formatNum(Math.round((1 - gfrpT / steelT) * 100))}% lighter</td></tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1E242B;margin:0;padding:36px;font-size:13px;line-height:1.5}
  h1{font-size:24px;margin:0 0 2px} h2{font-size:14px;margin:26px 0 8px;letter-spacing:.06em;text-transform:uppercase;color:#5B636B}
  .top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #1F5C46;padding-bottom:14px}
  .muted{color:#5B636B} .r{text-align:right} .right{text-align:right}
  table{width:100%;border-collapse:collapse} th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#5B636B;text-align:left;padding:8px 6px;border-bottom:1px solid #D9D4CB}
  th.r{text-align:right} td{padding:9px 6px;border-bottom:1px solid #EFEDE8}
  .sum{width:280px;margin-left:auto;margin-top:12px} .sum td{border:0;padding:4px 6px} .sum .tot td{font-weight:700;font-size:15px;border-top:2px solid #1F5C46;padding-top:8px}
  .note{font-size:11px;color:#5B636B;margin-top:8px} .box{background:#F6F2EC;border-radius:8px;padding:12px 14px}
</style></head><body>
  <div class="top">
    <div><h1>${esc(c.name)}</h1>
      <div class="muted">${nl([c.address, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join('\n'))}</div>
      <div class="muted">${[c.phone && `Phone ${esc(c.phone)}`, c.email && esc(c.email)].filter(Boolean).join(' · ')}</div>
      ${c.gstin ? `<div class="muted">GSTIN ${esc(c.gstin)}</div>` : ''}</div>
    <div class="right"><div style="font-size:20px;font-weight:700">QUOTATION</div>
      <div>${esc(q.number)}</div><div class="muted">Date ${formatDate(q.created_at)}</div>
      ${q.valid_until ? `<div class="muted">Valid until ${formatDate(q.valid_until)}</div>` : ''}</div>
  </div>

  <h2>Quotation for</h2>
  <div><strong>${esc(p?.name ?? '')}</strong></div>
  <div class="muted">${nl([p?.contact_person, p?.address, [p?.city, p?.state].filter(Boolean).join(', '), p?.gstin && `GSTIN ${p.gstin}`].filter(Boolean).join('\n'))}</div>

  <h2>Items</h2>
  <table><thead><tr><th>#</th><th>Description</th><th class="r">Metres</th><th class="r">Rate / m</th><th class="r">Amount</th><th class="r">GST</th><th class="r">Total</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <table class="sum">
    <tr><td>Taxable value</td><td class="r">${formatInr(t.taxable)}</td></tr>
    <tr><td>GST</td><td class="r">${formatInr(t.gst)}</td></tr>
    <tr class="tot"><td>Total</td><td class="r">${formatInr(t.total)}</td></tr>
  </table>

  <h2>GFRP and steel: weight for the same bar length</h2>
  <table><thead><tr><th>Diameter</th><th class="r">Length</th><th class="r">Steel (TMT)</th><th class="r">GFRP</th><th class="r">Difference</th></tr></thead>
  <tbody>${compare}</tbody></table>
  <div class="note">Indicative comparison on a same-diameter basis. Steel at d²/162 kg per metre; GFRP at about ${formatNum(2100)} kg/m³. Actual weight is stated on the batch test certificate. The bar size and spacing for each structure must be designed by the structural engineer to the applicable FRP design codes.</div>

  ${q.terms ? `<h2>Terms and conditions</h2><div class="box">${nl(q.terms)}</div>` : ''}
  ${c.bank_name || c.bank_account ? `<h2>Bank details</h2><div>${esc(c.bank_name)} · A/c ${esc(c.bank_account)} · IFSC ${esc(c.bank_ifsc)}</div>` : ''}
  <div class="note" style="margin-top:28px">This is a computer-generated quotation.</div>
</body></html>`;
}

/** Opens the share sheet with a PDF (phones) or the print dialog (browser). Resolves when it closes. */
export async function shareQuotePdf(html: string, fileLabel: string) {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Quotation ${fileLabel}` });
  } else {
    await Print.printAsync({ uri });
  }
}
