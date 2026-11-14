import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BigNumber, Body, Button, Card, Chip, ErrorText, Header, Label, Loading, Meter, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatNum } from '@/lib/calc';
import { RAW_ALERT_DAYS, useFinishedStock, useProductionEntries, useRawStock } from '@/lib/ops-queries';
import { productName } from '@/lib/queries';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

export default function FactoryHome() {
  const stock = useFinishedStock();
  const raw = useRawStock();
  const month = useProductionEntries(monthStart());

  const entries = month.data ?? [];
  const todays = entries.filter((e) => e.entry_date === today());
  const todayM = todays.reduce((s, e) => s + e.good_m, 0);
  const monthGood = entries.reduce((s, e) => s + e.good_m, 0);
  const monthScrap = entries.reduce((s, e) => s + e.scrap_m, 0);
  const scrapPct = monthGood + monthScrap > 0 ? (monthScrap / (monthGood + monthScrap)) * 100 : 0;
  const products = stock.data ?? [];
  const lowRaw = (raw.data ?? []).filter((r) => r.low);

  return (
    <Screen>
      <Header eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} title="Factory" />

      <View style={styles.grid}>
        <Card style={styles.stat}>
          <Body muted size={13}>Produced today</Body>
          <BigNumber>{formatNum(todayM)} m</BigNumber>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>This month</Body>
          <BigNumber>{formatNum(monthGood)} m</BigNumber>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Scrap this month</Body>
          <BigNumber tone={scrapPct > 3 ? 'attention' : undefined}>{scrapPct.toFixed(1)}%</BigNumber>
        </Card>
      </View>

      <Button label="Enter today’s production" onPress={() => router.push('/factory/production')} />

      {todays.length > 0 ? (
        <Card style={{ paddingVertical: Spacing.one }}>
          {todays.map((e, i) => {
            const p = products.find((x) => x.product.id === e.product_id)?.product;
            return (
              <Row key={e.id} first={i === 0}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="medium">{p ? productName(p) : 'Product'}</Body>
                  <Body muted size={12}>Batch {e.batch_no}</Body>
                </View>
                <Body weight="semibold">{formatNum(e.good_m)} m</Body>
              </Row>
            );
          })}
        </Card>
      ) : null}

      <Label style={styles.section}>Finished stock</Label>
      {stock.isLoading ? <Loading /> : null}
      <ErrorText>{stock.error?.message}</ErrorText>
      {products.length === 0 && !stock.isLoading ? <Card><Body muted>Add products in More › Products & rates.</Body></Card> : null}
      {products.length > 0 ? (
        <Card style={{ gap: 14 }}>
          {products.map((s) => {
            const cap = Math.max(s.reorder * 2, s.onHand, 1);
            return (
              <View key={s.product.id} style={styles.stockRow} accessibilityLabel={`${productName(s.product)}: ${formatNum(s.onHand)} metres${s.low ? ', low stock' : ''}`}>
                <Body weight="medium" style={{ width: 118 }} size={13}>{productName(s.product)}</Body>
                <Meter value={Math.max(0, s.onHand) / cap} marker={s.reorder > 0 ? s.reorder / cap : undefined} tone={s.low ? 'attention' : 'calm'} />
                <Body size={13} style={{ width: 70, textAlign: 'right' }}>{formatNum(s.onHand)} m</Body>
              </View>
            );
          })}
          <Body muted size={12}>Tick marks the reorder level. Set it per product in More › Products & rates.</Body>
        </Card>
      ) : null}

      <Label style={styles.section}>Raw material</Label>
      {lowRaw.length > 0 ? <Chip tone="attention">{`${lowRaw.map((r) => r.name).join(', ')} running low`}</Chip> : null}
      <Card style={{ paddingVertical: Spacing.one }}>
        {(raw.data ?? []).map((r, i) => (
          <Row key={r.id} first={i === 0}>
            <View style={{ flex: 1, gap: 2 }}>
              <Body weight="medium">{r.name}</Body>
              <Body muted size={12}>{formatNum(r.onHand)} {r.unit}{r.perDay > 0 ? ` · ${formatNum(r.perDay, 1)} a day` : ''}</Body>
            </View>
            {r.daysLeft != null ? <Chip tone={r.low ? 'attention' : 'calm'}>{r.low ? `${r.daysLeft} d · order` : `${r.daysLeft} days`}</Chip> : <Chip tone="neutral">No usage yet</Chip>}
          </Row>
        ))}
      </Card>
      <Button label="Receive material" variant="secondary" onPress={() => router.push('/factory/receive')} />
      <Body muted size={12} style={{ textAlign: 'center' }}>Alert when under {RAW_ALERT_DAYS} days left at the last two weeks’ usage.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 100, gap: 4 },
  section: { marginTop: Spacing.two, marginLeft: Spacing.one },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
