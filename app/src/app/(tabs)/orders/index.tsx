import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Card, Chip, Empty, ErrorText, Header, Loading, Screen, type Tone } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr, formatNum, isPriced, totals } from '@/lib/calc';
import type { OrderStage } from '@/lib/database.types';
import { DESPATCH_LABEL, STAGE_BAND, STAGE_LABEL, STAGES, useDespatches, useOrders, type DespatchBundle, type OrderBundle } from '@/lib/ops-queries';
import { productName } from '@/lib/queries';

export default function OrdersHome() {
  const { role } = useAuth();
  return (
    <Screen>
      <Header eyebrow={role === 'despatch' ? 'Your work' : 'Sales to delivery'} title={role === 'despatch' ? 'Despatches' : 'Orders'} />
      {role === 'despatch' ? <MyDespatches /> : <OrderList />}
    </Screen>
  );
}

function OrderList() {
  const c = useTheme();
  const { data, isLoading, error } = useOrders();
  const [stage, setStage] = useState<OrderStage | null>(null);
  const live = useMemo(() => (data ?? []).filter((o) => o.order.stage !== 'cancelled'), [data]);
  const shown = stage ? live.filter((o) => o.order.stage === stage) : live.filter((o) => o.order.stage !== 'delivered');

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {STAGES.map((s, i) => {
          const on = s === stage;
          const count = live.filter((o) => o.order.stage === s).length;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${STAGE_LABEL[s]}: ${count} orders`}
              onPress={() => setStage(on ? null : s)}
              style={[styles.stage, { backgroundColor: c.card, borderColor: on ? c.primary : c.card }]}>
              <View style={[styles.band, { backgroundColor: STAGE_BAND[i] }]} />
              <View style={{ padding: 12, gap: 2 }}>
                <Body muted size={12}>{i + 1} · {STAGE_LABEL[s]}</Body>
                <Text style={[styles.count, { color: c.text }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && shown.length === 0 ? (
        <Empty title="No orders here" detail={data.length === 0 ? 'When a customer accepts a quote, the owner creates the order from it.' : undefined} />
      ) : null}
      {shown.map((o) => (
        <OrderCard key={o.order.id} bundle={o} />
      ))}
    </>
  );
}

function OrderCard({ bundle: b }: { bundle: OrderBundle }) {
  const c = useTheme();
  const { order: o } = b;
  const ordered = b.items.reduce((s, i) => s + i.metres, 0);
  const sent = b.despatches.reduce((s, d) => s + d.items.reduce((x, i) => x + i.metres, 0), 0);
  const priced = b.items.length > 0 && b.items.every(isPriced);
  const i = STAGES.indexOf(o.stage);
  const late = o.due_date && o.stage !== 'delivered' && new Date(o.due_date) < new Date(new Date().toDateString());
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/orders/order', params: { id: o.id } })}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={16}>{b.party?.name ?? 'Customer'}</Body>
            <Body muted size={13}>{o.number}{o.po_number ? ` · PO ${o.po_number}` : ''}</Body>
          </View>
          {priced ? <Body weight="semibold">{formatInr(totals(b.items).total).replace(/\.00$/, '')}</Body> : null}
        </View>
        <Body muted size={13}>
          {formatNum(ordered)} m ordered{sent > 0 ? ` · ${formatNum(sent)} m sent` : ''}{o.due_date ? ` · due ${formatDate(o.due_date)}` : ''}
        </Body>
        <View style={[styles.bottom, { borderTopColor: c.line }]}>
          <View style={styles.stageTag}>
            <View style={[styles.dot, { backgroundColor: STAGE_BAND[Math.max(i, 0)] }]} />
            <Body size={13}>{STAGE_LABEL[o.stage]}</Body>
          </View>
          {late ? <Chip tone="attention">Past due date</Chip> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function MyDespatches() {
  const { profile } = useAuth();
  const { data, isLoading, error } = useDespatches(true, profile?.id);
  const open = (data ?? []).filter((d) => d.despatch.status !== 'delivered');
  const done = (data ?? []).filter((d) => d.despatch.status === 'delivered').slice(0, 10);
  return (
    <>
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && open.length === 0 ? <Empty title="Nothing to deliver" detail="New despatches from the owner will appear here." /> : null}
      {open.map((d) => (
        <DespatchCard key={d.despatch.id} bundle={d} />
      ))}
      {done.length > 0 ? <Body muted size={13} style={{ marginTop: Spacing.two, marginLeft: Spacing.one }}>Recently delivered</Body> : null}
      {done.map((d) => (
        <DespatchCard key={d.despatch.id} bundle={d} />
      ))}
    </>
  );
}

function DespatchCard({ bundle: b }: { bundle: DespatchBundle }) {
  const { despatch: d } = b;
  const metres = b.items.reduce((s, i) => s + i.metres, 0);
  const tone: Tone = d.status === 'delivered' ? 'calm' : d.status === 'loaded' ? 'neutral' : 'attention';
  const names = b.items.map((i) => {
    const p = b.products.find((x) => x.id === i.product_id);
    return p ? productName(p) : '';
  });
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/orders/despatch', params: { id: d.id } })}>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={16}>{b.party?.name ?? 'Customer'}</Body>
            <Body muted size={13}>{d.number} · {formatNum(metres)} m</Body>
          </View>
          <Chip tone={tone}>{DESPATCH_LABEL[d.status]}</Chip>
        </View>
        <Body muted size={13}>{names.join(', ')}</Body>
        {b.order?.site_address ? <Body muted size={13}>{b.order.site_address}</Body> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { width: 132, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  band: { height: 6 },
  count: { fontFamily: FontFamily.serif, fontSize: 26, lineHeight: 32 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, gap: Spacing.two },
  stageTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
