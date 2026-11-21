import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Label, Loading, Notice, Screen } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatInr, formatNum } from '@/lib/calc';
import { gstCsv, gstTotals, purchaseTotals } from '@/lib/ledger';
import { useGstMonth } from '@/lib/money-queries';
import { useCompany } from '@/lib/queries';
import { shareCsv } from '@/lib/quote-pdf';

const money = (n: number) => formatInr(n);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

export default function GstScreen() {
  const c = useTheme();
  const company = useCompany();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const label = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const { data, isLoading, error } = useGstMonth(iso(cursor), iso(next));
  const [msg, setMsg] = useState('');

  const rows = (data?.invoices ?? []).map((invoice) => ({ invoice, party: data!.parties.find((p) => p.id === invoice.party_id) ?? null }));
  const t = gstTotals(rows);
  const buys = (data?.purchases ?? []).map((po) => ({ po, supplier: data!.parties.find((p) => p.id === po.supplier_id) ?? null }));
  const pt = purchaseTotals(buys);
  const output = t.cgst + t.sgst + t.igst;
  const input = pt.cgst + pt.sgst + pt.igst;

  async function share() {
    setMsg('');
    if (!company.data) return;
    const csv = gstCsv(rows, data?.items ?? [], company.data, label, buys);
    const name = `sales-register-${iso(cursor).slice(0, 7)}.csv`;
    try {
      await shareCsv(csv, name);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const step = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <Screen nested>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => step(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, color: c.primaryText }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: FontFamily.serif, fontSize: 24, color: c.text }}>{label}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => step(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, color: c.primaryText }}>›</Text>
        </Pressable>
      </View>

      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>

      <Card style={{ gap: 8 }}>
        <Row2 label="Invoices" value={String(rows.length)} />
        <Row2 label="Taxable value" value={money(t.taxable)} />
        <Row2 label="CGST" value={money(t.cgst)} />
        <Row2 label="SGST" value={money(t.sgst)} />
        <Row2 label="IGST" value={money(t.igst)} />
        <Row2 label="Output GST (on sales)" value={money(output)} />
        <Row2 label="Input GST (supplier bills)" value={`− ${money(input)}`} />
        {output - input >= 0 ? <Row2 label="Net GST to pay" value={money(output - input)} bold /> : <Row2 label="Credit to carry forward" value={money(input - output)} bold />}
      </Card>

      <Label style={{ marginLeft: Spacing.one }}>Sales register</Label>
      {data && rows.length === 0 ? <Card><Body muted>No invoices issued in {label}.</Body></Card> : null}
      {rows.map((r) => (
        <Card key={r.invoice.id} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Body weight="semibold" style={{ flex: 1 }}>{r.party?.name ?? 'Customer'}</Body>
            <Body weight="semibold">{money(r.invoice.total)}</Body>
          </View>
          <Body muted size={12}>{r.invoice.number} · {formatDate(r.invoice.invoice_date)} · {r.party?.gstin ?? 'Unregistered'}</Body>
          <Body muted size={12}>Taxable {money(r.invoice.taxable_value)} · {r.invoice.is_interstate ? `IGST ${money(r.invoice.igst)}` : `CGST ${money(r.invoice.cgst)} · SGST ${money(r.invoice.sgst)}`}</Body>
        </Card>
      ))}

      {rows.length > 0 ? <HsnSummary items={data?.items ?? []} ids={new Set(rows.map((r) => r.invoice.id))} /> : null}

      {buys.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one }}>Supplier bills (input credit)</Label>
          {buys.map((r) => (
            <Card key={r.po.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Body weight="semibold" style={{ flex: 1 }}>{r.supplier?.name ?? 'Supplier'}</Body>
                <Body weight="semibold">{money(r.po.total)}</Body>
              </View>
              <Body muted size={12}>Bill {r.po.supplier_bill_no} · {formatDate(r.po.supplier_bill_date)} · {r.supplier?.gstin ?? 'Unregistered'}</Body>
              <Body muted size={12}>GST {r.po.is_interstate ? `IGST ${money(r.po.igst)}` : `CGST ${money(r.po.cgst)} · SGST ${money(r.po.sgst)}`}</Body>
            </Card>
          ))}
        </>
      ) : null}

      <Notice>Input credit counts supplier bills received through purchase orders. It is only valid if the supplier is registered and has filed, so your CA confirms it before you claim it.</Notice>
      <ErrorText>{msg}</ErrorText>
      <Button label="Share as CSV for your CA" onPress={share} disabled={rows.length === 0} />
    </Screen>
  );
}

function HsnSummary({ items, ids }: { items: { invoice_id: string; hsn_code: string | null; metres: number; taxable: number }[]; ids: Set<string> }) {
  const map = new Map<string, { qty: number; taxable: number }>();
  for (const i of items.filter((x) => ids.has(x.invoice_id))) {
    const cur = map.get(i.hsn_code ?? '—') ?? { qty: 0, taxable: 0 };
    cur.qty += i.metres;
    cur.taxable += i.taxable;
    map.set(i.hsn_code ?? '—', cur);
  }
  return (
    <>
      <Label style={{ marginLeft: Spacing.one }}>By HSN code</Label>
      <Card style={{ gap: 8 }}>
        {[...map].map(([hsn, h]) => (
          <View key={hsn} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body weight="medium">{hsn}</Body>
            <Body muted size={13}>{formatNum(h.qty, 2)} m · {formatInr(h.taxable)}</Body>
          </View>
        ))}
      </Card>
    </>
  );
}

function Row2({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
      <Body muted={!bold} weight={bold ? 'semibold' : 'regular'} style={{ flex: 1 }}>{label}</Body>
      <Body weight={bold ? 'semibold' : 'medium'}>{value}</Body>
    </View>
  );
}
