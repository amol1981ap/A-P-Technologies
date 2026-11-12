import { StyleSheet, Text, View } from 'react-native';

import { BigNumber, Body, Button, Card, Chip, Header, Label, Row, SampleNote, Screen } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { followUps, formatLakh, month, needsYou, owner } from '@/data/sample';
import { useTheme } from '@/hooks/use-theme';

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function TodayScreen() {
  const c = useTheme();
  const targetPct = Math.round((month.salesLakh / month.targetLakh) * 100);

  return (
    <Screen>
      <Header eyebrow={todayLabel()} title={`${greeting()}, ${owner.name}`} />

      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <Text style={[styles.heroLabel, { color: c.heroSubtext }]}>Sales this month</Text>
        <Text style={[styles.heroValue, { color: c.onPrimary }]}>{formatLakh(month.salesLakh)}</Text>
        <View style={[styles.heroTrack]}>
          <View style={[styles.heroFill, { width: `${targetPct}%` }]} />
        </View>
        <Text style={[styles.heroLabel, { color: c.heroSubtext }]}>
          {targetPct}% of {formatLakh(month.targetLakh)} target · ↗ {month.vsLastMonthPct}% vs last month
        </Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.stat}>
          <Body muted size={13}>New leads</Body>
          <BigNumber>{month.leads}</BigNumber>
          <Body muted size={12}>{month.hotLeads} hot</Body>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Open quotes</Body>
          <BigNumber>{month.quotes}</BigNumber>
          <Body muted size={12}>{month.quotesWaitingRate} need your rate</Body>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Bakaya</Body>
          <BigNumber tone="attention">{formatLakh(month.bakayaLakh)}</BigNumber>
          <Body muted size={12}>Oldest {month.oldestDueDays} days</Body>
        </Card>
      </View>

      <Label style={styles.section}>Needs you · {needsYou.length}</Label>
      <Card style={{ paddingVertical: Spacing.one }}>
        {needsYou.map((n, i) => (
          <Row key={n.id} first={i === 0}>
            <View style={[styles.dot, { backgroundColor: n.tone === 'attention' ? c.attention : c.primary }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body weight="semibold">{n.title}</Body>
              <Body muted size={13}>{n.detail}</Body>
            </View>
            <Button label={n.action} size="small" variant={n.tone === 'attention' ? 'urgent' : 'primary'} />
          </Row>
        ))}
      </Card>

      <Label style={styles.section}>Follow-ups today</Label>
      <Card style={{ paddingVertical: Spacing.one }}>
        {followUps.map((f, i) => (
          <Row key={f.id} first={i === 0}>
            <Body style={{ flex: 1 }}>{f.name}</Body>
            <Chip tone="neutral">{f.day}</Chip>
          </Row>
        ))}
      </Card>

      <SampleNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  heroLabel: { fontFamily: FontFamily.sans, fontSize: 13 },
  heroValue: { fontFamily: FontFamily.serif, fontSize: 38, lineHeight: 44 },
  heroTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 150, gap: 4 },
  section: { marginTop: Spacing.two, marginLeft: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
