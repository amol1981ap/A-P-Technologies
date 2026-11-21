import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Label, Loading, Notice, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatInr, formatNum } from '@/lib/calc';
import type { CompanySettings } from '@/lib/database.types';
import { computeInvoice, detectInterstate, rupeesInWords } from '@/lib/gst';
import { linesFromDespatch, useIssueInvoice, useUninvoiced, type Uninvoiced } from '@/lib/money-queries';
import { blankToNull, useCompany } from '@/lib/queries';

export default function NewInvoiceScreen() {
  const { despatchId } = useLocalSearchParams<{ despatchId?: string }>();
  const todo = useUninvoiced();
  const company = useCompany();
  if (todo.error) return <ErrorText>{todo.error.message}</ErrorText>;
  if (!todo.data || !company.data) return <Loading />;
  const u = todo.data.find((x) => x.despatch.id === despatchId);
  if (!u) return <Screen nested><Notice>This despatch already has an invoice, or could not be found.</Notice></Screen>;
  return <Form u={u} company={company.data} />;
}

function Form({ u, company }: { u: Uninvoiced; company: CompanySettings }) {
  const issue = useIssueInvoice();
  const detected = detectInterstate(company, u.party);
  const [inter, setInter] = useState<'intra' | 'inter'>(detected ? 'inter' : 'intra');
  const [place, setPlace] = useState(u.party.state ?? company.state ?? '');
  const [eway, setEway] = useState('');
  const [terms, setTerms] = useState('15');
  const [msg, setMsg] = useState('');

  const { lines, missing } = linesFromDespatch(u);
  const calc = computeInvoice(lines, inter === 'inter');
  const noHsn = lines.filter((l) => !l.hsn_code?.trim());
  const needsEway = calc.total > 50000;

  async function submit() {
    setMsg('');
    if (!company.gstin) return setMsg('Add your GSTIN in More › Company details first.');
    if (!company.state_code) return setMsg('Add your state in More › Company details first.');
    if (lines.length === 0 || missing.length > 0) return setMsg('Every despatched product needs a rate on the order.');
    const t = Number(terms);
    if (!Number.isInteger(t) || t < 0 || t > 180) return setMsg('Payment terms must be 0 to 180 days.');
    try {
      const id = await issue.mutateAsync({
        orderId: u.order.id,
        despatchId: u.despatch.id,
        partyId: u.party.id,
        lines,
        interstate: inter === 'inter',
        placeOfSupply: blankToNull(place),
        ewayBill: blankToNull(eway),
        termsDays: t,
      });
      router.replace({ pathname: '/money/invoice', params: { id } });
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Screen nested>
      <Card style={{ gap: 6 }}>
        <Body weight="semibold" size={18}>{u.party.name}</Body>
        <Body muted size={13}>{u.despatch.number} · {u.order.number}{u.order.po_number ? ` · PO ${u.order.po_number}` : ''}</Body>
        {u.party.gstin ? <Body muted size={13}>GSTIN {u.party.gstin}</Body> : <Body size={13} style={{ color: '#8A4321' }}>No GSTIN on this customer. The invoice will say unregistered.</Body>}
      </Card>

      {missing.length > 0 ? <Notice>{missing.join('. ')}. Fix it on the order first.</Notice> : null}
      {noHsn.length > 0 ? <Notice>HSN code missing for {noHsn.map((l) => l.description).join(', ')}. Add it in More › Products & rates.</Notice> : null}

      <Label style={{ marginLeft: Spacing.one }}>Lines</Label>
      <Card style={{ gap: 12 }}>
        {calc.lines.map((l, i) => (
          <View key={i} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Body weight="medium" style={{ flex: 1 }}>{l.description}</Body>
              <Body weight="medium">{formatInr(l.taxable)}</Body>
            </View>
            <Body muted size={12}>{formatNum(l.kg, 3)} kg ({formatNum(l.metres, 2)} m) × {formatInr(l.rate_per_kg)}/kg · HSN {l.hsn_code ?? '—'} · GST {l.gst_percent}%</Body>
          </View>
        ))}
      </Card>

      <Segmented
        label="Place of supply"
        options={[
          { value: 'intra', label: 'Same state · CGST + SGST' },
          { value: 'inter', label: 'Other state · IGST' },
        ]}
        value={inter}
        onChange={setInter}
      />
      {detected == null ? <Notice>The customer has no GSTIN or state, so I could not tell. Choose above.</Notice> : <Body muted size={12}>Worked out from the customer’s {u.party.gstin ? 'GSTIN' : 'state'}. Change it if the goods are delivered to another state.</Body>}

      <Card style={{ gap: 8 }}>
        <Row2 label="Taxable value" value={formatInr(calc.taxable)} />
        {inter === 'inter' ? <Row2 label="IGST" value={formatInr(calc.igst)} /> : (
          <>
            <Row2 label="CGST" value={formatInr(calc.cgst)} />
            <Row2 label="SGST" value={formatInr(calc.sgst)} />
          </>
        )}
        {calc.roundOff !== 0 ? <Row2 label="Round off" value={`${calc.roundOff > 0 ? '+' : ''}${calc.roundOff.toFixed(2)}`} /> : null}
        <Row2 label="Total" value={formatInr(calc.total)} bold />
        <Body muted size={12}>{rupeesInWords(calc.total)}</Body>
      </Card>

      <Card style={{ gap: Spacing.three }}>
        <Field label="Place of supply (state)" value={place} onChangeText={setPlace} autoCapitalize="words" />
        <Field label="E-way bill number" value={eway} onChangeText={setEway} keyboard="numeric" hint={needsEway ? 'Needed for goods worth more than ₹50,000. You can add it after issuing.' : 'Optional'} />
        <Field label="Payment due in (days)" value={terms} onChangeText={setTerms} keyboard="numeric" />
      </Card>

      <Notice>Issuing gives the invoice its number. After that it cannot be edited, only cancelled.</Notice>
      <ErrorText>{msg}</ErrorText>
      <Button label="Issue invoice" onPress={submit} busy={issue.isPending} disabled={lines.length === 0 || missing.length > 0 || noHsn.length > 0} />
    </Screen>
  );
}

function Row2({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Body muted={!bold} weight={bold ? 'semibold' : 'regular'}>{label}</Body>
      <Body weight={bold ? 'semibold' : 'medium'} size={bold ? 17 : 15}>{value}</Body>
    </View>
  );
}
