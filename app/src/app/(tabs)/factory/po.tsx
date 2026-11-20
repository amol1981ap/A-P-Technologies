import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Field, Label, Loading, Notice, Screen, Segmented } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDaysIso, formatDate, formatInr, formatNum, round2 } from '@/lib/calc';
import type { CompanySettings } from '@/lib/database.types';
import { detectInterstate } from '@/lib/gst';
import { useRawStock } from '@/lib/ops-queries';
import { PO_STATUS_LABEL, useReceivePurchaseOrder, useUpdatePurchaseOrder, usePurchaseOrder, type PoRow } from '@/lib/purchasing-queries';
import { blankToNull, useCompany } from '@/lib/queries';

export default function PoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const po = usePurchaseOrder(id);
  const company = useCompany();
  const raw = useRawStock();
  if (po.error) return <ErrorText>{po.error.message}</ErrorText>;
  if (!po.data || !company.data || !raw.data) return <Loading />;
  return <PoView key={`${po.data.po.updated_at}`} row={po.data} company={company.data} names={new Map(raw.data.map((r) => [r.id, `${r.name} (${r.unit})`]))} />;
}

function PoView({ row: r, company, names }: { row: PoRow; company: CompanySettings; names: Map<string, string> }) {
  const c = useTheme();
  const { po } = r;
  const receive = useReceivePurchaseOrder();
  const update = useUpdatePurchaseOrder();
  const detected = detectInterstate(company, { gstin: r.supplier?.gstin ?? null, state: r.supplier?.state ?? null });
  const [inter, setInter] = useState<'intra' | 'inter'>(detected ? 'inter' : 'intra');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(addDaysIso(0));
  const [msg, setMsg] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const tax = round2(r.items.reduce((s, i) => s + (i.qty * i.rate * i.gst_percent) / 100, 0));

  async function submit() {
    setMsg('');
    if (!billNo.trim()) return setMsg('Enter the supplier’s bill number.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate.trim())) return setMsg('Write the bill date as YYYY-MM-DD.');
    try {
      await receive.mutateAsync({ id: po.id, items: r.items, interstate: inter === 'inter', billNo, billDate: billDate.trim() });
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const act = async (fn: () => Promise<unknown>) => {
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <Screen nested>
      <Stack.Screen options={{ title: po.number }} />
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={18}>{r.supplier?.name ?? 'Supplier'}</Body>
            <Body muted size={13}>Ordered {formatDate(po.order_date)}{po.expected_date ? ` · expected ${formatDate(po.expected_date)}` : ''}</Body>
          </View>
          <Chip tone={po.status === 'received' ? 'calm' : po.status === 'ordered' ? 'neutral' : 'attention'}>{PO_STATUS_LABEL[po.status]}</Chip>
        </View>
        {r.supplier?.gstin ? <Body muted size={13}>GSTIN {r.supplier.gstin}</Body> : null}
      </Card>

      <Label style={{ marginLeft: Spacing.one }}>Items</Label>
      <Card style={{ gap: 12 }}>
        {r.items.map((i) => (
          <View key={i.id} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Body weight="medium" style={{ flex: 1 }}>{names.get(i.material_id) ?? 'Material'}</Body>
              <Body weight="medium">{formatInr(round2(i.qty * i.rate))}</Body>
            </View>
            <Body muted size={12}>{formatNum(i.qty, 2)} × {formatInr(i.rate)} · GST {i.gst_percent}%</Body>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 4 }}>
          <Row label="Before GST" value={formatInr(po.status === 'received' ? po.taxable_value : r.subtotal)} />
          {po.status === 'received' ? (
            <>
              {po.is_interstate ? <Row label="IGST" value={formatInr(po.igst)} /> : (<><Row label="CGST" value={formatInr(po.cgst)} /><Row label="SGST" value={formatInr(po.sgst)} /></>)}
              <Row label="Bill total" value={formatInr(po.total)} bold />
            </>
          ) : (
            <Row label="GST (estimate)" value={formatInr(tax)} />
          )}
        </View>
      </Card>

      {po.status === 'received' ? (
        <>
          <Notice>Received {formatDate(po.received_on)} against bill {po.supplier_bill_no}{po.supplier_bill_date ? ` of ${formatDate(po.supplier_bill_date)}` : ''}. The goods are in raw material stock, and the GST counts as input tax credit.</Notice>
          {po.paid_on ? <Notice>Paid on {formatDate(po.paid_on)}.</Notice> : <Button label="Mark as paid" variant="secondary" onPress={() => act(() => update.mutateAsync({ id: po.id, paid_on: addDaysIso(0) }))} busy={update.isPending} />}
        </>
      ) : null}

      {po.status === 'ordered' ? (
        <>
          <Card style={{ gap: Spacing.three }}>
            <Body weight="semibold" size={16}>Goods arrived</Body>
            <Field label="Supplier bill number" value={billNo} onChangeText={setBillNo} autoCapitalize="characters" />
            <Field label="Bill date" value={billDate} onChangeText={setBillDate} placeholder="2026-12-05" />
            <Segmented
              label="Supplier is"
              options={[
                { value: 'intra', label: 'Same state · CGST + SGST' },
                { value: 'inter', label: 'Other state · IGST' },
              ]}
              value={inter}
              onChange={setInter}
            />
            {detected == null ? <Body muted size={12}>Add the supplier’s GSTIN or state in More › Parties so this is worked out for you.</Body> : null}
            <ErrorText>{msg}</ErrorText>
            <Button label="Receive into stock" onPress={submit} busy={receive.isPending} />
          </Card>
          {confirmCancel ? (
            <Card style={{ gap: Spacing.three }}>
              <Button label="Yes, cancel this order" variant="urgent" onPress={() => act(() => update.mutateAsync({ id: po.id, status: 'cancelled' }))} />
              <Button label="Keep it" variant="secondary" onPress={() => setConfirmCancel(false)} />
            </Card>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ textAlign: 'center', fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.textSecondary }}>Cancel this order</Text>
            </Pressable>
          )}
        </>
      ) : null}
      {po.status !== 'ordered' ? <ErrorText>{msg}</ErrorText> : null}
      {blankToNull(po.notes ?? '') ? <Body muted size={13}>{po.notes}</Body> : null}
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Body muted={!bold} weight={bold ? 'semibold' : 'regular'}>{label}</Body>
      <Body weight={bold ? 'semibold' : 'medium'} size={bold ? 17 : 15}>{value}</Body>
    </View>
  );
}
