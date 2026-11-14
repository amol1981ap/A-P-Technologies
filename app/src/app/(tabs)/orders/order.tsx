import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, ErrorText, Field, Label, Loading, Notice, Screen, Segmented, type Tone } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr, formatNum, isPriced, totals } from '@/lib/calc';
import type { OrderStage } from '@/lib/database.types';
import {
  DESPATCH_LABEL,
  STAGE_LABEL,
  useFinishedStock,
  useOrder,
  useProductionEntries,
  useReleaseDespatch,
  useSetStage,
  type OrderBundle,
} from '@/lib/ops-queries';
import { productName, useProducts, useTeam } from '@/lib/queries';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const order = useOrder(id);
  const products = useProducts(false);
  if (order.error) return <ErrorText>{order.error.message}</ErrorText>;
  if (!order.data || !products.data) return <Loading />;
  return <OrderView bundle={order.data} />;
}

const MANUAL_STAGES: { value: OrderStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_production', label: 'In production' },
  { value: 'ready', label: 'Ready' },
];

function OrderView({ bundle: b }: { bundle: OrderBundle }) {
  const c = useTheme();
  const { isOwner, role } = useAuth();
  const { order: o } = b;
  const products = useProducts(false).data ?? [];
  const stock = useFinishedStock().data ?? [];
  const setStage = useSetStage();
  const [msg, setMsg] = useState('');
  const [releasing, setReleasing] = useState(false);

  const pName = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p ? productName(p) : 'Product';
  };
  const sentFor = (pid: string) => b.despatches.reduce((s, d) => s + d.items.filter((i) => i.product_id === pid).reduce((x, i) => x + i.metres, 0), 0);
  const priced = b.items.length > 0 && b.items.every(isPriced);
  const showMoney = (isOwner || role === 'sales') && priced;
  const fullySent = b.items.length > 0 && b.items.every((i) => sentFor(i.product_id) >= i.metres);

  async function changeStage(stage: OrderStage) {
    setMsg('');
    try {
      await setStage.mutateAsync({ id: o.id, stage });
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const tone: Tone = o.stage === 'delivered' ? 'calm' : o.stage === 'cancelled' ? 'neutral' : 'calm';

  return (
    <Screen nested>
      <Stack.Screen options={{ title: o.number }} />
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={18}>{b.party?.name ?? 'Customer'}</Body>
            <Body muted size={13}>{[o.po_number ? `PO ${o.po_number}` : null, o.due_date ? `Due ${formatDate(o.due_date)}` : null].filter(Boolean).join(' · ') || 'No PO number yet'}</Body>
          </View>
          <Chip tone={tone}>{STAGE_LABEL[o.stage]}</Chip>
        </View>
        {o.site_address ? <Body muted size={13}>Site: {o.site_address}</Body> : null}
      </Card>

      {isOwner && o.stage !== 'dispatched' && o.stage !== 'delivered' && o.stage !== 'cancelled' ? (
        <Segmented label="Stage" options={MANUAL_STAGES} value={o.stage as 'new' | 'in_production' | 'ready'} onChange={changeStage} />
      ) : null}

      <Label style={{ marginLeft: Spacing.one }}>Items</Label>
      {b.items.length === 0 ? <Card><Body muted>Item lines are visible to the owner and sales.</Body></Card> : null}
      {b.items.map((i) => {
        const sent = sentFor(i.product_id);
        const left = Math.max(0, i.metres - sent);
        const s = stock.find((x) => x.product.id === i.product_id);
        return (
          <Card key={i.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Body weight="semibold" size={16} style={{ flex: 1 }}>{pName(i.product_id)}</Body>
              {left === 0 ? <Chip>All sent</Chip> : null}
            </View>
            <Body muted size={13}>
              {formatNum(i.metres)} m ordered · {formatNum(sent)} m sent · {formatNum(left)} m to go
            </Body>
            {isOwner && left > 0 && s ? (
              <Body size={13} style={{ color: s.onHand >= left ? c.primaryText : c.attentionText }}>
                {formatNum(s.onHand)} m in stock{s.onHand < left ? ` · short by ${formatNum(left - s.onHand)} m` : ''}
              </Body>
            ) : null}
          </Card>
        );
      })}

      {showMoney ? (
        <Card style={{ gap: 6 }}>
          <Row label="Taxable value" value={formatInr(totals(b.items).taxable)} />
          <Row label="GST" value={formatInr(totals(b.items).gst)} />
          <Row label="Total" value={formatInr(totals(b.items).total)} bold />
        </Card>
      ) : null}

      <Label style={{ marginLeft: Spacing.one }}>Despatches</Label>
      {b.despatches.length === 0 ? <Card><Body muted>Nothing despatched yet.</Body></Card> : null}
      {b.despatches.map((d) => (
        <Pressable key={d.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/orders/despatch', params: { id: d.id } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Body weight="semibold">{d.number}</Body>
              <Body muted size={13}>{formatNum(d.items.reduce((s, i) => s + i.metres, 0))} m{d.vehicle_no ? ` · ${d.vehicle_no}` : ''}</Body>
            </View>
            <Chip tone={d.status === 'delivered' ? 'calm' : d.status === 'loaded' ? 'neutral' : 'attention'}>{DESPATCH_LABEL[d.status]}</Chip>
          </Card>
        </Pressable>
      ))}

      <ErrorText>{msg}</ErrorText>

      {isOwner && !fullySent && o.stage !== 'cancelled' && o.stage !== 'delivered' ? (
        releasing ? (
          <ReleaseForm bundle={b} onDone={() => setReleasing(false)} />
        ) : (
          <Button label="Release despatch" onPress={() => setReleasing(true)} />
        )
      ) : null}
      {fullySent && o.stage !== 'delivered' ? <Notice>Everything is on its way. The order turns Delivered when the last despatch is delivered.</Notice> : null}
      {isOwner && o.stage === 'new' && b.despatches.length === 0 ? (
        <Pressable accessibilityRole="button" onPress={() => changeStage('cancelled')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ textAlign: 'center', fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.textSecondary }}>Cancel this order</Text>
        </Pressable>
      ) : null}
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

function ReleaseForm({ bundle: b, onDone }: { bundle: OrderBundle; onDone: () => void }) {
  const { profile } = useAuth();
  const products = useProducts(false).data ?? [];
  const stock = useFinishedStock().data ?? [];
  const [since] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const entries = useProductionEntries(since).data ?? [];
  const team = useTeam().data ?? [];
  const release = useReleaseDespatch();

  const remaining = b.items
    .map((i) => ({ item: i, left: Math.max(0, i.metres - b.despatches.reduce((s, d) => s + d.items.filter((x) => x.product_id === i.product_id).reduce((a, x) => a + x.metres, 0), 0)) }))
    .filter((r) => r.left > 0);

  const latestBatch = (pid: string) => entries.find((e) => e.product_id === pid && e.good_m > 0)?.batch_no ?? '';
  // Only what the owner types is stored; defaults are worked out at render so they follow data that loads late.
  const [edits, setEdits] = useState<Record<string, { metres?: string; batch?: string }>>({});
  const lineOf = (r: (typeof remaining)[number]) => ({
    metres: edits[r.item.product_id]?.metres ?? String(r.left),
    batch: edits[r.item.product_id]?.batch ?? latestBatch(r.item.product_id),
  });
  const drivers = team.filter((t) => t.active && t.role === 'despatch');
  const [chosen, setChosen] = useState<string | null>(null);
  const driver = chosen ?? (drivers.length === 1 ? drivers[0].id : null);
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    if (!driver) return setMsg('Choose who will deliver.');
    const out = [];
    for (const r of remaining) {
      const l = lineOf(r);
      const m = Number(l.metres);
      if (l.metres.trim() === '' || m === 0) continue;
      if (!(m > 0)) return setMsg('Enter metres for each line, or clear the line to skip it.');
      if (m > r.left) return setMsg(`${productName(products.find((p) => p.id === r.item.product_id)!)}: only ${formatNum(r.left)} m left on this order.`);
      out.push({ product_id: r.item.product_id, metres: m, batch_no: l.batch.trim() || null });
    }
    if (out.length === 0) return setMsg('Enter metres for at least one line.');
    try {
      await release.mutateAsync({ orderId: b.order.id, assignedTo: driver, releasedBy: profile!.id, lines: out });
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>Release despatch</Body>
      <Notice>You confirm the PO matches the quote by releasing this. Your despatch person gets a slip with the delivery address and batch numbers.</Notice>
      {remaining.map((r) => {
        const p = products.find((x) => x.id === r.item.product_id);
        const s = stock.find((x) => x.product.id === r.item.product_id);
        const l = lineOf(r);
        const short = s && Number(l.metres) > s.onHand;
        return (
          <View key={r.item.id} style={{ gap: 8 }}>
            <Body weight="medium">{p ? productName(p) : 'Product'} <Body muted size={13}>· {formatNum(r.left)} m to go</Body></Body>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Metres" value={l.metres} keyboard="decimal-pad" onChangeText={(v) => setEdits((x) => ({ ...x, [r.item.product_id]: { ...x[r.item.product_id], metres: v } }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Batch no." value={l.batch} autoCapitalize="characters" onChangeText={(v) => setEdits((x) => ({ ...x, [r.item.product_id]: { ...x[r.item.product_id], batch: v } }))} />
              </View>
            </View>
            {short ? <Body size={12} style={{ color: '#8A4321' }}>Only {formatNum(s!.onHand)} m in stock. You can still release.</Body> : null}
          </View>
        );
      })}
      {drivers.length === 0 ? (
        <Notice>Add a despatch person first in More › Team.</Notice>
      ) : (
        <ChipPicker label="Deliver by" options={drivers.map((d) => ({ value: d.id, label: d.full_name }))} value={driver} onChange={setChosen} />
      )}
      <ErrorText>{msg}</ErrorText>
      <Button label="Release" onPress={submit} busy={release.isPending} disabled={drivers.length === 0} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
