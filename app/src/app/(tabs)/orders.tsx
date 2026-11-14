import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Card, Chip, Header, SampleNote, Screen, type Tone } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { formatLakh, formatMetres, orders, stages, type Order, type OrderStage } from '@/data/sample';
import { useTheme } from '@/hooks/use-theme';

/** Deepening green from first to last stage. */
const STAGE_BAND = ['#D6E7DF', '#9CCBB8', '#5E9E84', '#2F7259', '#1F5C46'];
const paymentTone: Record<Order['payment'], Tone> = { Paid: 'calm', Advance: 'neutral', Overdue: 'attention' };

export default function OrdersScreen() {
  const c = useTheme();
  const [stage, setStage] = useState<OrderStage | null>(null);
  const shown = stage ? orders.filter((o) => o.stage === stage) : orders;

  return (
    <Screen>
      <Header eyebrow={`${orders.length} open this month`} title="Orders" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {stages.map((s, i) => {
          const on = s === stage;
          const count = orders.filter((o) => o.stage === s).length;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${s}: ${count} orders`}
              onPress={() => setStage(on ? null : s)}
              style={[styles.stage, { backgroundColor: c.card, borderColor: on ? c.primary : c.card }]}>
              <View style={[styles.band, { backgroundColor: STAGE_BAND[i] }]} />
              <View style={{ padding: 12, gap: 2 }}>
                <Body muted size={12}>{i + 1} · {s}</Body>
                <Text style={[styles.count, { color: c.text }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {shown.map((o) => {
        const i = stages.indexOf(o.stage);
        return (
          <Card key={o.id} style={{ gap: 10 }}>
            <View style={styles.top}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="semibold" size={16}>{o.customer}</Body>
                <Body muted size={13}>{o.id} · {o.place}</Body>
              </View>
              <Body weight="semibold">{formatLakh(o.valueLakh)}</Body>
            </View>
            <Body muted size={13}>
              {o.diameterMm} mm {o.surface.toLowerCase()} · {formatMetres(o.metres)}
            </Body>
            <View style={[styles.bottom, { borderTopColor: c.line }]}>
              <View style={styles.stageTag}>
                <View style={[styles.dot, { backgroundColor: STAGE_BAND[i] }]} />
                <Body size={13}>{o.stage}</Body>
              </View>
              <Chip tone={paymentTone[o.payment]}>{o.payment}</Chip>
            </View>
          </Card>
        );
      })}

      <SampleNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { width: 132, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  band: { height: 6 },
  count: { fontFamily: FontFamily.serif, fontSize: 26, lineHeight: 32 },
  top: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, gap: Spacing.two },
  stageTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
});
