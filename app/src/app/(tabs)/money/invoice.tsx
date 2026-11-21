import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDaysIso, formatDate, formatInr, formatNum, waNumber } from '@/lib/calc';
import type { CompanySettings, PaymentMode } from '@/lib/database.types';
import { invoiceHtml } from '@/lib/invoice-pdf';
import { invoiceStatus, receiptMessage, reminderMessage } from '@/lib/ledger';
import { PAYMENT_MODE_LABEL, useInvoice, useRecordPayment, useUpdateInvoice, type InvoiceDetail } from '@/lib/money-queries';
import { blankToNull, useCompany } from '@/lib/queries';
import { shareQuotePdf } from '@/lib/quote-pdf';

const money = (n: number) => formatInr(n).replace(/\.00$/, '');
const MODES = (Object.keys(PAYMENT_MODE_LABEL) as PaymentMode[]).map((m) => ({ value: m, label: PAYMENT_MODE_LABEL[m] }));

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const inv = useInvoice(id);
  const company = useCompany();
  if (inv.error) return <ErrorText>{inv.error.message}</ErrorText>;
  if (!inv.data || !company.data) return <Loading />;
  return <View style={{ flex: 1 }}><InvoiceView key={`${inv.data.invoice.updated_at}-${inv.data.payments.length}`} d={inv.data} company={company.data} /></View>;
}

function InvoiceView({ d, company }: { d: InvoiceDetail; company: CompanySettings }) {
  const c = useTheme();
  const v = d.invoice;
  const update = useUpdateInvoice();
  const pay = useRecordPayment();
  const [eway, setEway] = useState(v.eway_bill_no ?? '');
  const [amount, setAmount] = useState(d.balance > 0 ? String(d.balance) : '');
  const [date, setDate] = useState(addDaysIso(0));
  const [mode, setMode] = useState<PaymentMode>('bank_transfer');
  const [ref, setRef] = useState('');
  const [receipt, setReceipt] = useState<{ amount: number; balance: number } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const row = { invoice: v, party: d.party, paid: d.paid, balance: d.balance, daysOverdue: d.daysOverdue };
  const st = invoiceStatus(row);
  const phone = waNumber(d.party?.whatsapp || d.party?.phone);

  async function guarded(fn: () => Promise<void>) {
    setMsg('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const sharePdf = () =>
    guarded(() =>
      shareQuotePdf(
        invoiceHtml({ company, party: d.party, invoice: v, items: d.items, order: d.order, despatch: d.despatch, terms: `Payment due within ${v.terms_days} days of the invoice date.` }),
        v.number ?? 'invoice',
      ),
    );

  const remind = () =>
    guarded(async () => {
      await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(reminderMessage(row, company))}`);
      await update.mutateAsync({ id: v.id, last_reminder_at: new Date().toISOString(), reminders_sent: v.reminders_sent + 1 });
    });

  const record = () =>
    guarded(async () => {
      const a = Number(amount);
      if (!(a > 0)) throw new Error('Enter the amount received.');
      if (a > d.balance + 0.001) throw new Error(`The balance is only ${money(d.balance)}.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) throw new Error('Write the date as YYYY-MM-DD.');
      await pay.mutateAsync({ invoice_id: v.id, party_id: v.party_id, amount: a, received_on: date.trim(), mode, reference: blankToNull(ref) });
      setReceipt({ amount: a, balance: d.balance - a });
    });

  const saveEway = () => guarded(async () => void (await update.mutateAsync({ id: v.id, eway_bill_no: blankToNull(eway) })));
  const cancel = () => guarded(async () => void (await update.mutateAsync({ id: v.id, status: 'cancelled' })));

  return (
    <Screen nested>
      <Stack.Screen options={{ title: v.number ?? 'Invoice' }} />

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={18}>{d.party?.name ?? 'Customer'}</Body>
            <Body muted size={13}>{formatDate(v.invoice_date)}{v.due_date ? ` · due ${formatDate(v.due_date)}` : ''}</Body>
          </View>
          <Chip tone={st.tone}>{st.text}</Chip>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
          <Body muted>Total</Body>
          <Body weight="semibold" size={18}>{formatInr(v.total)}</Body>
        </View>
        {v.status === 'issued' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted>Received</Body><Body weight="medium">{formatInr(d.paid)}</Body></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body weight="semibold">Balance</Body><Body weight="semibold" style={{ color: d.balance > 0 ? c.attentionText : c.primaryText }}>{formatInr(d.balance)}</Body></View>
          </>
        ) : null}
      </Card>

      <Label style={{ marginLeft: Spacing.one }}>Lines</Label>
      <Card style={{ gap: 12 }}>
        {d.items.map((i) => (
          <View key={i.id} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Body weight="medium" style={{ flex: 1 }}>{i.description}</Body>
              <Body weight="medium">{formatInr(i.taxable)}</Body>
            </View>
            <Body muted size={12}>{formatNum(i.kg, 3)} kg ({formatNum(i.metres, 2)} m) × {formatInr(i.rate_per_kg)}/kg · HSN {i.hsn_code} · GST {i.gst_percent}%</Body>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 4 }}>
          <Row2 label="Taxable value" value={formatInr(v.taxable_value)} />
          {v.is_interstate ? <Row2 label="IGST" value={formatInr(v.igst)} /> : (<><Row2 label="CGST" value={formatInr(v.cgst)} /><Row2 label="SGST" value={formatInr(v.sgst)} /></>)}
          {v.round_off !== 0 ? <Row2 label="Round off" value={`${v.round_off > 0 ? '+' : ''}${v.round_off.toFixed(2)}`} /> : null}
        </View>
      </Card>

      <Button label="Share invoice PDF" variant="secondary" onPress={sharePdf} busy={busy} />

      {v.status === 'issued' ? (
        <Card style={{ gap: Spacing.three }}>
          <Field label="E-way bill number" value={eway} onChangeText={setEway} keyboard="numeric" hint={v.total > 50000 && !v.eway_bill_no ? 'Needed for goods worth more than ₹50,000' : undefined} />
          {(blankToNull(eway) ?? '') !== (v.eway_bill_no ?? '') ? <Button label="Save e-way bill" size="small" variant="secondary" onPress={saveEway} /> : null}
        </Card>
      ) : null}

      {d.payments.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one }}>Payments</Label>
          <Card style={{ gap: 10 }}>
            {d.payments.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="medium">{formatInr(p.amount)}</Body>
                  <Body muted size={12}>{formatDate(p.received_on)} · {PAYMENT_MODE_LABEL[p.mode]}{p.reference ? ` · ${p.reference}` : ''}</Body>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {receipt ? (
        <Card style={{ gap: Spacing.three }}>
          <Notice>Recorded {money(receipt.amount)}.</Notice>
          {phone ? (
            <Button label="Send receipt on WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(receiptMessage({ party: d.party, invoice: v, amount: receipt.amount, balance: receipt.balance, company }))}`)} />
          ) : null}
        </Card>
      ) : null}

      {v.status === 'issued' && d.balance > 0 && !receipt ? (
        <>
          <Card style={{ gap: Spacing.three }}>
            <Body weight="semibold" size={16}>Record a payment</Body>
            <Field label="Amount received (₹)" value={amount} onChangeText={setAmount} keyboard="decimal-pad" />
            <Field label="Date" value={date} onChangeText={setDate} placeholder="2026-11-30" />
            <ChipPicker label="Paid by" options={MODES} value={mode} onChange={setMode} />
            <Field label="Reference (optional)" value={ref} onChangeText={setRef} placeholder="UTR or cheque number" />
            <Button label="Record payment" onPress={record} busy={busy} />
          </Card>

          <Card style={{ gap: Spacing.three }}>
            <Body weight="semibold" size={16}>Payment reminder</Body>
            <Body muted size={13}>{reminderMessage(row, company)}</Body>
            {phone ? <Button label="Send reminder on WhatsApp" variant={d.daysOverdue > 0 ? 'urgent' : 'primary'} onPress={remind} busy={busy} /> : <Notice>Add a phone number to this customer to send reminders.</Notice>}
            {v.reminders_sent > 0 ? <Body muted size={12}>{v.reminders_sent} sent · last {formatDate(v.last_reminder_at)}</Body> : null}
          </Card>
        </>
      ) : null}

      <ErrorText>{msg}</ErrorText>

      {v.status === 'issued' && d.paid === 0 ? (
        confirmCancel ? (
          <Card style={{ gap: Spacing.three }}>
            <Notice>Cancelling keeps the number and marks the invoice cancelled. If it was already shared, tell the customer and raise a new invoice.</Notice>
            <Button label="Yes, cancel this invoice" variant="urgent" onPress={cancel} busy={busy} />
            <Button label="Keep it" variant="secondary" onPress={() => setConfirmCancel(false)} />
          </Card>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.textSecondary }}>Cancel this invoice</Text>
          </Pressable>
        )
      ) : null}
    </Screen>
  );
}

function Row2({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Body muted>{label}</Body>
      <Body weight="medium">{value}</Body>
    </View>
  );
}
