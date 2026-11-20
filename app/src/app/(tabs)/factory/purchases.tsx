import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, Empty, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addDaysIso, formatDate, formatInr, formatNum } from '@/lib/calc';
import { PO_STATUS_LABEL, poSubtotal, useCreatePurchaseOrder, usePurchaseOrders } from '@/lib/purchasing-queries';
import { blankToNull, useParties } from '@/lib/queries';
import { useRawStock } from '@/lib/ops-queries';

export default function PurchasesScreen() {
  const { data, isLoading, error } = usePurchaseOrders();
  const [adding, setAdding] = useState(false);
  return (
    <Screen nested>
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && data.length === 0 && !adding ? <Empty title="No purchase orders yet" detail="Order resin, roving, hardener or sand from a supplier." /> : null}
      {(data ?? []).map((r) => (
        <Pressable key={r.po.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/factory/po', params: { id: r.po.id } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Body weight="semibold" size={16}>{r.supplier?.name ?? 'Supplier'}</Body>
              <Body muted size={13}>{r.po.number} · {r.items.length} item{r.items.length === 1 ? '' : 's'} · {formatInr(r.po.status === 'received' ? r.po.taxable_value : r.subtotal).replace(/\.00$/, '')} before GST</Body>
              {r.po.status === 'ordered' && r.po.expected_date ? <Body muted size={12}>Expected {formatDate(r.po.expected_date)}</Body> : null}
            </View>
            <Chip tone={r.po.status === 'received' ? 'calm' : r.po.status === 'ordered' ? 'neutral' : 'attention'}>{PO_STATUS_LABEL[r.po.status]}</Chip>
          </Card>
        </Pressable>
      ))}
      {adding ? <NewPo onDone={() => setAdding(false)} /> : <Button label="New purchase order" onPress={() => setAdding(true)} />}
    </Screen>
  );
}

type Line = { material_id: string | null; qty: string; rate: string; gst: string };

function NewPo({ onDone }: { onDone: () => void }) {
  const suppliers = useParties('supplier');
  const raw = useRawStock();
  const create = useCreatePurchaseOrder();
  const [supplier, setSupplier] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([{ material_id: null, qty: '', rate: '', gst: '18' }]);
  const [expected, setExpected] = useState(addDaysIso(7));
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  if (!suppliers.data || !raw.data) return <Loading />;
  const set = (i: number, patch: Partial<Line>) => setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const valid = lines.filter((l) => l.material_id && Number(l.qty) > 0);
  const subtotal = poSubtotal(valid.map((l) => ({ qty: Number(l.qty), rate: Number(l.rate) || 0 })));

  async function submit() {
    setMsg('');
    if (!supplier) return setMsg('Choose the supplier.');
    if (valid.length === 0) return setMsg('Add at least one material with a quantity.');
    for (const l of valid) {
      if (l.rate.trim() === '' || !(Number(l.rate) >= 0)) return setMsg('Enter the rate for every line.');
      if (!(Number(l.gst) >= 0 && Number(l.gst) <= 28)) return setMsg('GST must be between 0 and 28.');
    }
    if (expected.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(expected.trim())) return setMsg('Write the date as YYYY-MM-DD.');
    try {
      const id = await create.mutateAsync({
        supplierId: supplier,
        expectedDate: blankToNull(expected),
        notes: blankToNull(notes),
        items: valid.map((l) => ({ material_id: l.material_id!, qty: Number(l.qty), rate: Number(l.rate), gst_percent: Number(l.gst) })),
      });
      onDone();
      router.push({ pathname: '/factory/po', params: { id } });
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>New purchase order</Body>
      {suppliers.data.length === 0 ? <Notice>Add your suppliers first in More › Parties › Suppliers.</Notice> : <ChipPicker label="Supplier" options={suppliers.data.map((s) => ({ value: s.id, label: s.name }))} value={supplier} onChange={setSupplier} />}
      {lines.map((l, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Label>Item {i + 1}</Label>
          <ChipPicker options={raw.data.map((m) => ({ value: m.id, label: m.name }))} value={l.material_id} onChange={(v) => set(i, { material_id: v })} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Quantity" value={l.qty} onChangeText={(v) => set(i, { qty: v })} keyboard="decimal-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Rate ₹/unit" value={l.rate} onChangeText={(v) => set(i, { rate: v })} keyboard="decimal-pad" /></View>
            <View style={{ width: 76 }}><Field label="GST %" value={l.gst} onChangeText={(v) => set(i, { gst: v })} keyboard="decimal-pad" /></View>
          </View>
        </View>
      ))}
      <Button label="Add another item" size="small" variant="secondary" onPress={() => setLines((l) => [...l, { material_id: null, qty: '', rate: '', gst: '18' }])} />
      <Field label="Expected on" value={expected} onChangeText={setExpected} placeholder="2026-12-05" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      {subtotal > 0 ? <Body muted size={13}>{formatNum(valid.length)} item{valid.length === 1 ? '' : 's'} · {formatInr(subtotal)} before GST</Body> : null}
      <ErrorText>{msg}</ErrorText>
      <Button label="Place order" onPress={submit} busy={create.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
