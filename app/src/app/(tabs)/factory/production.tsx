import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ChipPicker, ErrorText, Field, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { ProductionEntry } from '@/lib/database.types';
import { useFinishedStock, useProductionEntries, useSaveProduction } from '@/lib/ops-queries';
import { blankToNull, productName } from '@/lib/queries';

import { addDaysIso } from '@/lib/calc';
const today = () => addDaysIso(0);
const num = (s: string) => (s.trim() === '' ? null : Number(s));

export default function ProductionScreen() {
  const stock = useFinishedStock();
  const entries = useProductionEntries(today());
  const [productId, setProductId] = useState<string | null>(null);
  if (!stock.data || !entries.data) return <Loading />;
  const products = stock.data.map((s) => s.product);
  const existing = entries.data.find((e) => e.product_id === productId && e.entry_date === today()) ?? null;

  return (
    <Screen nested>
      <ChipPicker label="What did you make?" options={products.map((p) => ({ value: p.id, label: productName(p) }))} value={productId} onChange={setProductId} />
      {products.length === 0 ? <Notice>No products yet. The owner adds them in More › Products & rates.</Notice> : null}
      {productId ? <EntryForm key={`${productId}-${existing?.updated_at ?? 'new'}`} productId={productId} existing={existing} /> : null}
    </Screen>
  );
}

function EntryForm({ productId, existing }: { productId: string; existing: ProductionEntry | null }) {
  const save = useSaveProduction();
  const [good, setGood] = useState(existing ? String(existing.good_m) : '');
  const [scrap, setScrap] = useState(existing ? String(existing.scrap_m) : '');
  const [resin, setResin] = useState(existing?.resin_kg != null ? String(existing.resin_kg) : '');
  const [roving, setRoving] = useState(existing?.roving_kg != null ? String(existing.roving_kg) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    const g = Number(good);
    const s = scrap.trim() === '' ? 0 : Number(scrap);
    if (good.trim() === '' || !(g >= 0)) return setMsg('Enter the good metres made.');
    if (!(s >= 0)) return setMsg('Scrap cannot be negative.');
    const r = num(resin);
    const v = num(roving);
    if ((r != null && !(r >= 0)) || (v != null && !(v >= 0))) return setMsg('Material used cannot be negative.');
    try {
      await save.mutateAsync({ entry_date: today(), product_id: productId, good_m: g, scrap_m: s, resin_kg: r, roving_kg: v, notes: blankToNull(notes) });
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <>
      {existing ? <Notice>Already entered today (batch {existing.batch_no}). Saving updates it.</Notice> : null}
      <Card style={{ gap: Spacing.three }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Good metres" value={good} onChangeText={setGood} keyboard="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Scrap metres" value={scrap} onChangeText={setScrap} keyboard="decimal-pad" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Resin used (kg)" value={resin} onChangeText={setResin} keyboard="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Roving used (kg)" value={roving} onChangeText={setRoving} keyboard="decimal-pad" /></View>
        </View>
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Stoppages, problems…" />
        <Body muted size={12}>The batch number is made from today’s date, diameter and surface. Resin and roving are taken off raw material stock.</Body>
      </Card>
      <ErrorText>{msg}</ErrorText>
      <Button label={existing ? 'Update production' : 'Save production'} onPress={submit} busy={save.isPending} />
    </>
  );
}
