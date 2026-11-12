import { StyleSheet, View } from 'react-native';

import { BigNumber, Body, Button, Card, Chip, Header, Label, Meter, Row, SampleNote, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { factoryToday, formatMetres, rawMaterials, RESIN_ALERT_DAYS, stock } from '@/data/sample';

export default function FactoryScreen() {
  const f = factoryToday;
  return (
    <Screen>
      <Header eyebrow={`Batch ${f.batch}`} title="Factory" />

      <View style={styles.grid}>
        <Card style={styles.stat}>
          <Body muted size={13}>Produced today</Body>
          <BigNumber>{formatMetres(f.producedM)}</BigNumber>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>This month</Body>
          <BigNumber>{formatMetres(f.monthM)}</BigNumber>
          <Body muted size={12}>Plan {formatMetres(f.planM)}</Body>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Scrap</Body>
          <BigNumber>{f.scrapPct}%</BigNumber>
          <Body muted size={12}>Target under 2%</Body>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Resin left</Body>
          <BigNumber tone={f.resinDaysLeft < RESIN_ALERT_DAYS ? 'attention' : undefined}>{f.resinDaysLeft} days</BigNumber>
        </Card>
      </View>

      <Button label="Enter today's production" />

      <Label style={styles.section}>Finished stock · tick = reorder level</Label>
      <Card style={{ gap: 14 }}>
        {stock.map((s) => {
          const low = s.metres < s.reorderAt;
          return (
            <View key={s.diameterMm} style={styles.stockRow} accessibilityLabel={`${s.diameterMm} mm: ${formatMetres(s.metres)}${low ? ', low stock' : ''}`}>
              <Body weight="medium" style={{ width: 56 }}>{s.diameterMm} mm</Body>
              <Meter value={s.metres / s.capacity} marker={s.reorderAt / s.capacity} tone={low ? 'attention' : 'calm'} />
              <Body size={13} style={{ width: 76, textAlign: 'right' }}>{formatMetres(s.metres)}</Body>
              <View style={{ width: 52 }}>{low ? <Chip tone="attention">Low</Chip> : null}</View>
            </View>
          );
        })}
      </Card>

      <Label style={styles.section}>Raw material</Label>
      <Card style={{ paddingVertical: Spacing.one }}>
        {rawMaterials.map((r, i) => {
          const low = r.daysLeft < RESIN_ALERT_DAYS;
          return (
            <Row key={r.name} first={i === 0}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="medium">{r.name}</Body>
                <Body muted size={12}>{r.stock} · {r.perDay} a day</Body>
              </View>
              <Chip tone={low ? 'attention' : 'calm'}>{low ? `${r.daysLeft} days · order now` : `${r.daysLeft} days`}</Chip>
            </Row>
          );
        })}
      </Card>

      <SampleNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 140, gap: 4 },
  section: { marginTop: Spacing.two, marginLeft: Spacing.one },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
