import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigNumber, Body, Button, Card, Empty, Header, Label, Loading, Row, Screen, type Tone } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ROLE_LABEL, useAuth } from '@/lib/auth';
import { formatInr, formatNum, isPriced, totals } from '@/lib/calc';
import { followUpState } from '@/lib/followups';
import { useLeads, useQuotes } from '@/lib/sales-queries';

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

type Need = { id: string; title: string; detail: string; action: string; tone: Tone; go: () => void; rank: number };

export default function TodayScreen() {
  const { profile, role } = useAuth();
  const firstName = profile?.full_name.split(' ')[0] || 'there';

  if (role === 'despatch' || role === 'factory') {
    return (
      <Screen>
        <Header eyebrow={todayLabel()} title={`${greeting()}, ${firstName}`} />
        <Card style={{ gap: Spacing.two }}>
          <Body weight="semibold">{ROLE_LABEL[role]}</Body>
          <Body muted>
            {role === 'despatch'
              ? 'Your despatch slips will appear here when the owner releases an order.'
              : 'Today’s production entry and stock will appear here.'}
          </Body>
        </Card>
      </Screen>
    );
  }
  return <SalesToday firstName={firstName} />;
}

function SalesToday({ firstName }: { firstName: string }) {
  const c = useTheme();
  const { isOwner } = useAuth();
  const leads = useLeads();
  const quotes = useQuotes();

  const view = useMemo(() => {
    const ls = leads.data ?? [];
    const qs = quotes.data ?? [];
    const needs: Need[] = [];

    for (const item of qs) {
      const { quote: q, items } = item;
      const open = () => () => router.push({ pathname: '/leads/quote', params: { id: q.id } });
      const metres = formatNum(items.reduce((s, i) => s + i.metres, 0));
      if (q.status === 'draft') {
        const priced = items.length > 0 && items.every(isPriced);
        if (items.length === 0) {
          needs.push({ id: q.id, title: 'Add items', detail: `${item.customer} · ${q.number}`, action: 'Open', tone: 'neutral', go: open(), rank: 4 });
        } else if (!priced && isOwner) {
          needs.push({ id: q.id, title: 'Add your rate', detail: `${item.customer} · ${metres} m`, action: 'Rate', tone: 'calm', go: open(), rank: 0 });
        } else if (priced) {
          needs.push({ id: q.id, title: 'Send quote', detail: `${item.customer} · ${formatInr(totals(items).total)}`, action: 'Send', tone: 'calm', go: open(), rank: 1 });
        }
      }
      const f = followUpState(q);
      if (f?.due) {
        needs.push({
          id: q.id,
          title: f.pastCycle ? 'Past decision window' : `Follow up · day ${f.nextDay}`,
          detail: `${item.customer} · ${q.number} · sent ${f.age} d ago`,
          action: 'Open',
          tone: 'attention',
          go: open(),
          rank: 2,
        });
      }
    }

    const quotedLeadIds = new Set(qs.map((x) => x.quote.lead_id));
    for (const l of ls.filter((x) => x.status === 'new' && !quotedLeadIds.has(x.id))) {
      needs.push({
        id: l.id,
        title: l.score === 'hot' ? 'Hot lead' : 'New lead',
        detail: `${l.company || l.contact_name}${l.location ? ` · ${l.location}` : ''}`,
        action: 'Open',
        tone: l.score === 'hot' ? 'attention' : 'calm',
        go: () => router.push({ pathname: '/leads/lead', params: { id: l.id } }),
        rank: l.score === 'hot' ? 1.5 : 3,
      });
    }
    needs.sort((a, b) => a.rank - b.rank);

    const sent = qs.filter((x) => x.quote.status === 'sent');
    const sentValue = sent.reduce((s, x) => s + (x.items.every(isPriced) ? totals(x.items).total : 0), 0);
    return {
      needs,
      newLeads: ls.filter((l) => l.status === 'new').length,
      hot: ls.filter((l) => l.status === 'new' && l.score === 'hot').length,
      openQuotes: qs.filter((x) => x.quote.status === 'draft' || x.quote.status === 'sent').length,
      sentCount: sent.length,
      sentValue,
      followUpsDue: sent.filter((x) => followUpState(x.quote)?.due).length,
    };
  }, [leads.data, quotes.data, isOwner]);

  const loading = leads.isLoading || quotes.isLoading;

  return (
    <Screen>
      <Header eyebrow={todayLabel()} title={`${greeting()}, ${firstName}`} />

      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <Text style={[styles.heroLabel, { color: c.heroSubtext }]}>Quotes out with customers</Text>
        <Text style={[styles.heroValue, { color: c.onPrimary }]}>{formatInr(view.sentValue).replace(/\.00$/, '')}</Text>
        <Text style={[styles.heroLabel, { color: c.heroSubtext }]}>
          {view.sentCount} quote{view.sentCount === 1 ? '' : 's'} sent · waiting for a decision
        </Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.stat}>
          <Body muted size={13}>New leads</Body>
          <BigNumber>{view.newLeads}</BigNumber>
          <Body muted size={12}>{view.hot} hot</Body>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Open quotes</Body>
          <BigNumber>{view.openQuotes}</BigNumber>
          <Body muted size={12}>draft or sent</Body>
        </Card>
        <Card style={styles.stat}>
          <Body muted size={13}>Follow-ups due</Body>
          <BigNumber tone={view.followUpsDue ? 'attention' : undefined}>{view.followUpsDue}</BigNumber>
          <Body muted size={12}>day 3, 7, 12</Body>
        </Card>
      </View>

      <Label style={styles.section}>Needs you · {view.needs.length}</Label>
      {loading ? <Loading /> : null}
      {!loading && view.needs.length === 0 ? (
        <Empty title="All clear" detail="New leads and follow-ups will show up here." />
      ) : null}
      {view.needs.length > 0 ? (
        <Card style={{ paddingVertical: Spacing.one }}>
          {view.needs.slice(0, 8).map((n, i) => (
            <Row key={`${n.id}-${n.title}`} first={i === 0}>
              <View style={[styles.dot, { backgroundColor: n.tone === 'attention' ? c.attention : c.primary }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="semibold">{n.title}</Body>
                <Body muted size={13}>{n.detail}</Body>
              </View>
              <Button label={n.action} size="small" variant={n.tone === 'attention' ? 'urgent' : 'primary'} onPress={n.go} />
            </Row>
          ))}
        </Card>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  heroLabel: { fontFamily: FontFamily.sans, fontSize: 13 },
  heroValue: { fontFamily: FontFamily.serif, fontSize: 38, lineHeight: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 100, gap: 4 },
  section: { marginTop: Spacing.two, marginLeft: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
