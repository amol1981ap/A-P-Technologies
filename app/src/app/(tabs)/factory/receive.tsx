import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, ChipPicker, ErrorText, Field, Loading, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useRawStock, useReceiveStock } from '@/lib/ops-queries';
import { blankToNull } from '@/lib/queries';

export default function ReceiveScreen() {
  const raw = useRawStock();
  const save = useReceiveStock();
  const [material, setMaterial] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  if (!raw.data) return <Loading />;
  const unit = raw.data.find((r) => r.id === material)?.unit ?? 'kg';

  async function submit() {
    setMsg('');
    const q = Number(qty);
    if (!material) return setMsg('Choose the material.');
    if (!(q > 0)) return setMsg('Enter the quantity received.');
    try {
      await save.mutateAsync({ material_id: material, qty: q, note: blankToNull(note) });
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Screen nested>
      <Card style={{ gap: Spacing.three }}>
        <ChipPicker label="Material" options={raw.data.map((r) => ({ value: r.id, label: r.name }))} value={material} onChange={setMaterial} />
        <Field label={`Quantity received (${unit})`} value={qty} onChangeText={setQty} keyboard="decimal-pad" />
        <Field label="Supplier / invoice (optional)" value={note} onChangeText={setNote} />
      </Card>
      <ErrorText>{msg}</ErrorText>
      <Button label="Add to stock" onPress={submit} busy={save.isPending} />
    </Screen>
  );
}
