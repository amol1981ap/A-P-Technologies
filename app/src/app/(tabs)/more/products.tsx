import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, Empty, ErrorText, Field, Loading, Notice, Screen, Segmented, Toggle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import type { RebarShape, RebarSurface } from '@/lib/database.types';
import { blankToNull, productName, STANDARD_DIAMETERS, useAddStandardSizes, useProducts, useSaveProduct, useSetRate, type ProductWithRate } from '@/lib/queries';

const SHAPES: { value: RebarShape; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'bent_up', label: 'Bent-up' },
];

const SURFACES: { value: RebarSurface; label: string }[] = [
  { value: 'sand_coated', label: 'Sand-coated' },
  { value: 'ribbed', label: 'Ribbed' },
];

export default function ProductsScreen() {
  const { isOwner } = useAuth();
  const { data, isLoading, error } = useProducts(isOwner);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const addStandard = useAddStandardSizes();
  const [bulkMsg, setBulkMsg] = useState('');
  const [quick, setQuick] = useState(false);

  return (
    <Screen nested>
      {isOwner ? (
        <Notice>Only you can see and change rates. Every change is kept as history.</Notice>
      ) : null}

      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>

      {data && data.length === 0 && !adding ? (
        <Empty title="No products yet" detail={isOwner ? 'Add each diameter and surface you sell.' : 'The owner has not added products yet.'} />
      ) : null}

      {isOwner && data && (data.length < 4 || quick) && !adding ? (
        <Card style={{ gap: Spacing.three }}>
          <Body weight="semibold">Quick start</Body>
          <Body muted size={13}>Add the usual diameters ({STANDARD_DIAMETERS.join(', ')} mm) in one tap. Starting rates are ₹150/kg straight and ₹180/kg bent-up, GST 18%. Change any rate afterwards, and switch off sizes you do not sell.</Body>
          <ErrorText>{bulkMsg}</ErrorText>
          {SHAPES.map((sh) => (
            <View key={sh.value} style={{ flexDirection: 'row', gap: 10 }}>
              {SURFACES.map((s) => (
                <View key={s.value} style={{ flex: 1 }}>
                  <Button
                    label={`${sh.label}, ${s.label.toLowerCase()}`}
                    variant="secondary"
                    busy={addStandard.isPending}
                    onPress={() => {
                      setBulkMsg('');
                      setQuick(true);
                      addStandard.mutate({ surface: s.value, shape: sh.value }, { onError: (e) => setBulkMsg(e.message) });
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
        </Card>
      ) : null}

      {data?.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          isOwner={isOwner}
          open={openId === p.id}
          onToggle={() => setOpenId(openId === p.id ? null : p.id)}
        />
      ))}

      {isOwner ? (
        adding ? (
          <NewProduct onDone={() => setAdding(false)} />
        ) : (
          <>
            <Button label="Add product" variant="secondary" onPress={() => setAdding(true)} />
            {(data?.length ?? 0) >= 4 || quick ? <Button label={quick ? 'Done adding sizes' : 'Add standard sizes'} variant="secondary" onPress={() => setQuick((v) => !v)} /> : null}
          </>
        )
      ) : null}
    </Screen>
  );
}

function ProductCard({ product: p, isOwner, open, onToggle }: { product: ProductWithRate; isOwner: boolean; open: boolean; onToggle: () => void }) {
  const c = useTheme();
  const setRate = useSetRate();
  const saveProduct = useSaveProduct();
  const [rate, setRateText] = useState(p.rate_per_kg != null ? String(p.rate_per_kg) : '');
  const [gst, setGst] = useState(p.gst_percent != null ? String(p.gst_percent) : '18');
  const [weight, setWeight] = useState(String(p.kg_per_m));
  const [hsn, setHsn] = useState(p.hsn_code ?? '');
  const [reorder, setReorder] = useState(p.reorder_level_m ? String(p.reorder_level_m) : '');
  const [msg, setMsg] = useState('');

  async function save() {
    setMsg('');
    const r = Number(rate);
    const g = gst.trim() === '' ? null : Number(gst);
    if (!(r >= 0) || rate.trim() === '') return setMsg('Enter a rate per kg.');
    const w = Number(weight);
    if (!(w > 0)) return setMsg('Enter the weight per metre in kg.');
    if (g != null && !(g >= 0 && g <= 28)) return setMsg('GST must be between 0 and 28.');
    try {
      const ro = reorder.trim() === '' ? 0 : Number(reorder);
      if (!(ro >= 0)) return setMsg('Reorder level must be zero or more.');
      if ((p.hsn_code ?? '') !== hsn.trim() || ro !== p.reorder_level_m || w !== p.kg_per_m) {
        await saveProduct.mutateAsync({ id: p.id, diameter_mm: p.diameter_mm, surface: p.surface, shape: p.shape, standard_length_m: p.standard_length_m, hsn_code: blankToNull(hsn), kg_per_m: w, reorder_level_m: ro });
      }
      if (r !== p.rate_per_kg || g !== p.gst_percent) await setRate.mutateAsync({ product_id: p.id, rate_per_kg: r, gst_percent: g });
      onToggle();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: 12, opacity: p.active ? 1 : 0.6 }}>
      <Pressable
        accessibilityRole={isOwner ? 'button' : undefined}
        disabled={!isOwner}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semibold" size={16}>{productName(p)}</Body>
          <Body muted size={13}>
            {p.standard_length_m} m bars · {p.kg_per_m} kg/m{p.hsn_code ? ` · HSN ${p.hsn_code}` : ''}{p.active ? '' : ' · not sold'}
          </Body>
        </View>
        {isOwner ? (
          p.rate_per_kg != null ? (
            <Body weight="semibold">₹{p.rate_per_kg}/kg</Body>
          ) : (
            <Chip tone="attention">Set rate</Chip>
          )
        ) : null}
      </Pressable>

      {open && isOwner ? (
        <View style={{ gap: Spacing.three, borderTopWidth: 1, borderTopColor: c.line, paddingTop: Spacing.three }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Rate (₹ per kg)" value={rate} onChangeText={setRateText} keyboard="decimal-pad" hint="Before GST" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="GST %" value={gst} onChangeText={setGst} keyboard="decimal-pad" hint="18% additional" />
            </View>
          </View>
          <Field label="Weight per metre (kg)" value={weight} onChangeText={setWeight} keyboard="decimal-pad" hint="Typical estimate. Weigh a bar and correct it. Quotes, orders and invoices use this." />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="HSN code" value={hsn} onChangeText={setHsn} keyboard="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Reorder level (m)" value={reorder} onChangeText={setReorder} keyboard="decimal-pad" hint="Alert below this stock" />
            </View>
          </View>
          <Toggle
            label="Currently sold"
            value={p.active}
            onChange={(v) =>
              saveProduct.mutate({ id: p.id, diameter_mm: p.diameter_mm, surface: p.surface, shape: p.shape, standard_length_m: p.standard_length_m, hsn_code: p.hsn_code, kg_per_m: p.kg_per_m, active: v })
            }
          />
          <ErrorText>{msg}</ErrorText>
          <Button label="Save" onPress={save} busy={setRate.isPending || saveProduct.isPending} />
        </View>
      ) : null}
    </Card>
  );
}

function NewProduct({ onDone }: { onDone: () => void }) {
  const save = useSaveProduct();
  const [diameter, setDiameter] = useState('');
  const [surface, setSurface] = useState<RebarSurface>('sand_coated');
  const [shape, setShape] = useState<RebarShape>('straight');
  const [length, setLength] = useState('12');
  const [hsn, setHsn] = useState('70193900');
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    const d = Number(diameter);
    const l = Number(length);
    if (!Number.isInteger(d) || d < 4 || d > 40) return setMsg('Diameter must be a whole number from 4 to 40 mm.');
    if (!(l > 0)) return setMsg('Enter the standard bar length in metres.');
    try {
      await save.mutateAsync({ diameter_mm: d, surface, shape, standard_length_m: l, hsn_code: blankToNull(hsn) });
      onDone();
    } catch (e) {
      const m = (e as Error).message;
      setMsg(/duplicate|unique/i.test(m) ? 'This diameter, surface and shape already exists.' : m);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>New product</Body>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Diameter (mm)" value={diameter} onChangeText={setDiameter} keyboard="numeric" placeholder="12" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Bar length (m)" value={length} onChangeText={setLength} keyboard="decimal-pad" />
        </View>
      </View>
      <Segmented label="Surface" options={SURFACES} value={surface} onChange={setSurface} />
      <Segmented label="Shape" options={SHAPES} value={shape} onChange={setShape} />
      <Field label="HSN code (optional)" value={hsn} onChangeText={setHsn} keyboard="numeric" />
      <ErrorText>{msg}</ErrorText>
      <Button label="Add product" onPress={submit} busy={save.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
