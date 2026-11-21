import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import { Body, Button, Card, ChipPicker, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatInr, formatNum, gfrpKgPerM, steelKgPerM } from '@/lib/calc';
import { productName, useCompany, useProducts } from '@/lib/queries';

const FALLBACK_DIAMETERS = [8, 10, 12, 16, 20, 25];

export default function CalculatorScreen() {
  const { isOwner } = useAuth();
  const products = useProducts(isOwner);
  const company = useCompany();
  const [dia, setDia] = useState<number>(12);
  const [tonnes, setTonnes] = useState('10');
  const [steelPrice, setSteelPrice] = useState('');
  const [msg, setMsg] = useState('');

  const diameters = useMemo(() => {
    const d = [...new Set((products.data ?? []).filter((p) => p.active).map((p) => p.diameter_mm))].sort((a, b) => a - b);
    return d.length ? d : FALLBACK_DIAMETERS;
  }, [products.data]);

  if (products.isLoading) return <Loading />;

  const t = Number(tonnes);
  const valid = t > 0;
  const metres = valid ? (t * 1000) / steelKgPerM(dia) : 0;
  // Use the weight per metre of your product when it exists, else the typical estimate.
  const product = (products.data ?? []).find((p) => p.diameter_mm === dia && p.active);
  const gfrpT = (metres * (product?.kg_per_m ?? gfrpKgPerM(dia))) / 1000;
  const saved = t - gfrpT;
  const pct = valid ? Math.round((1 - gfrpT / t) * 100) : 0;

  // Owner only: the rate card is hidden from everyone else.
  const card = isOwner ? (products.data ?? []).find((p) => p.diameter_mm === dia && p.active && p.rate_per_kg != null) : undefined;
  const sp = Number(steelPrice);
  const showCost = isOwner && card && valid && sp > 0;
  const steelCost = t * 1000 * sp;
  const gfrpCost = gfrpT * 1000 * (card?.rate_per_kg ?? 0);

  function share() {
    setMsg('');
    if (!valid) return setMsg('Enter the steel quantity first.');
    const text = `${company.data?.name ?? 'A P Technologies'}: for ${formatNum(t, 1)} t of ${dia} mm steel bar (${formatNum(metres)} m), the same length in GFRP weighs about ${formatNum(gfrpT, 2)} t, ${pct}% lighter. Indicative, same-diameter basis; the engineer designs the final bar size. Happy to share test reports.`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  return (
    <Screen nested>
      <Notice>For a customer conversation. Same-diameter comparison. The structural engineer decides the final bar size and spacing.</Notice>
      <Card style={{ gap: Spacing.three }}>
        <ChipPicker label="Bar diameter" options={diameters.map((d) => ({ value: String(d), label: `${d} mm` }))} value={String(dia)} onChange={(v) => setDia(Number(v))} />
        <Field label="Steel quantity (tonnes)" value={tonnes} onChangeText={setTonnes} keyboard="decimal-pad" />
      </Card>

      {valid ? (
        <Card style={{ gap: 10 }}>
          <Row label="Total bar length" value={`${formatNum(metres)} m`} />
          <Row label="Same length in steel" value={`${formatNum(t, 2)} t`} />
          <Row label="Same length in GFRP" value={`${formatNum(gfrpT, 2)} t`} />
          <Row label="Weight saved" value={`${formatNum(saved, 2)} t (${pct}%)`} bold />
        </Card>
      ) : null}

      {isOwner ? (
        <>
          <Label style={{ marginLeft: Spacing.one }}>Cost, for you only</Label>
          <Card style={{ gap: Spacing.three }}>
            <Field label="Steel price today (₹ per kg)" value={steelPrice} onChangeText={setSteelPrice} keyboard="decimal-pad" hint="Type the current market price. It is not saved." />
            {card ? <Body muted size={13}>Your rate for {productName(card)}: {formatInr(card.rate_per_kg!)} per kg.</Body> : <Body muted size={13}>Set a rate for {dia} mm in More › Products & rates to compare cost.</Body>}
            {showCost ? (
              <View style={{ gap: 8 }}>
                <Row label="Steel cost" value={formatInr(steelCost).replace(/\.00$/, '')} />
                <Row label="GFRP cost" value={formatInr(gfrpCost).replace(/\.00$/, '')} />
                <Body muted size={12}>Material only, before GST, freight and any design change in bar size. Do not quote this as a saving without the engineer’s design.</Body>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      <ErrorText>{msg}</ErrorText>
      <Button label="Share weight comparison on WhatsApp" onPress={share} />
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
      <Body muted={!bold} weight={bold ? 'semibold' : 'regular'}>{label}</Body>
      <Body weight={bold ? 'semibold' : 'medium'} size={bold ? 17 : 15}>{value}</Body>
    </View>
  );
}
