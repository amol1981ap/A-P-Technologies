import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Card, Chip, Header, SampleNote, Screen, type Tone } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { leads, type LeadScore } from '@/data/sample';
import { useTheme } from '@/hooks/use-theme';

const FILTERS: ('All' | LeadScore)[] = ['All', 'Hot', 'Warm', 'Cold'];
const scoreTone: Record<LeadScore, Tone> = { Hot: 'attention', Warm: 'calm', Cold: 'neutral' };

export default function LeadsScreen() {
  const c = useTheme();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const shown = filter === 'All' ? leads : leads.filter((l) => l.score === filter);

  return (
    <Screen>
      <Header eyebrow={`${leads.length} this week`} title="Leads" />

      <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: c.neutralSoft }]}>
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <Pressable
              key={f}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f)}
              style={[styles.segmentItem, on && { backgroundColor: c.primary }]}>
              <Text style={{ fontFamily: on ? FontFamily.sansMedium : FontFamily.sans, fontSize: 14, color: on ? c.onPrimary : c.text }}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {shown.map((l) => (
        <Card key={l.id} style={{ gap: 10 }}>
          <View style={styles.top}>
            <View style={{ flex: 1, gap: 2 }}>
              <Body weight="semibold" size={16}>{l.name}</Body>
              <Body muted size={13}>{l.detail}</Body>
            </View>
            <Chip tone={scoreTone[l.score]}>{l.score}</Chip>
          </View>
          <View style={[styles.bottom, { borderTopColor: c.line }]}>
            <Body muted size={12}>{l.source}</Body>
            <Body weight="medium" size={13} style={{ color: c.primaryText }}>{l.next} →</Body>
          </View>
        </Card>
      ))}

      <SampleNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill, gap: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10, gap: Spacing.two },
});
