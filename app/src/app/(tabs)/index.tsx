import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigNumber, Body, Button, Card, Empty, Header, Label, Loading, Row, Screen, type Tone } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { addDaysIso, formatInr, formatNum, isPriced, totals } from '@/lib/calc';
import { followUpState } from '@/lib/followups';
import { useDespatches, useFinishedStock, useOrders, useProductionEntries, useRawStock } from '@/lib/ops-queries';
import { productName, useCompany, useProducts, useTeam } from '@/lib/queries';
import { MyTasks } from '@/components/my-tasks';
import { useProspects } from '@/lib/growth-queries';
import { taskState, useTasks } from '@/lib/tasks-queries';
import { reminderDue } from '@/lib/ledger';
import { useInvoices, useUninvoiced } from '@/lib/money-queries';
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

  if (role === 'despatch') return <DespatchToday firstName={firstName} />;
  if (role === 'factory') return <FactoryToday firstName={firstName} />;
  return <SalesToday firstName={firstName} />;
}

function DespatchToday({ firstName }: { firstName: string }) {
  const c = useTheme();
  const { profile } = useAuth();
  const { data, isLoading } = useDespatches(true, profile?.id);
  const open = (data ?? []).filter((d) => d.despatch.status !== 'delivered');
  return (
    <Screen>
      <Header eyebrow={todayLabel()} title={`${greeting()}, ${firstName}`} />
      <Label style={{ marginLeft: Spacing.one }}>To deliver · {open.length}</Label>
      {isLoading ? <Loading /> : null}
      {!isLoading && open.length === 0 ? <Empty title="Nothing to deliver" detail="New despatches from the owner will appear here." /> : null}
      {open.length > 0 ? (
        <Card style={{ paddingVertical: Spacing.one }}>
          {open.map((d, i) => (
            <Row key={d.despatch.id} first={i === 0}>
              <View style={[styles.dot, { backgroundColor: d.despatch.status === 'pending' ? c.attention : c.primary }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="semibold">{d.party?.name ?? 'Customer'}</Body>
                <Body muted size={13}>{d.despatch.number} · {formatNum(d.items.reduce((s, x) => s + x.metres, 0))} m · {d.despatch.status === 'pending' ? 'to load' : 'loaded'}</Body>
              </View>
              <Button label="Open" size="small" onPress={() => router.push({ pathname: '/orders/despatch', params: { id: d.despatch.id } })} />
            </Row>
          ))}
        </Card>
      ) : null}
      <MyTasks />
    </Screen>
  );
}

function FactoryToday({ firstName }: { firstName: string }) {
  const c = useTheme();
  const today = addDaysIso(0);
  const entries = useProductionEntries(today);
  const stock = useFinishedStock();
  const raw = useRawStock();
  const done = (entries.data ?? []).length > 0;
  const low = (stock.data ?? []).filter((s) => s.low);
  const lowRaw = (raw.data ?? []).filter((r) => r.low);
  return (
    <Screen>
      <Header eyebrow={todayLabel()} title={`${greeting()}, ${firstName}`} />
      <Card style={{ gap: Spacing.three }}>
        <Body weight="semibold" size={16}>{done ? 'Production entered today' : 'Production not entered yet'}</Body>
        <Body muted>{done ? `${formatNum((entries.data ?? []).reduce((s, e) => s + e.good_m, 0))} m made today.` : 'Enter what the line made once the shift is done.'}</Body>
        <Button label={done ? 'Add or update' : 'Enter today’s production'} onPress={() => router.push('/factory/production')} />
      </Card>
      {low.length + lowRaw.length > 0 ? <Label style={{ marginLeft: Spacing.one }}>Running low</Label> : null}
      {low.length + lowRaw.length > 0 ? (
        <Card style={{ paddingVertical: Spacing.one }}>
          {low.map((s, i) => (
            <Row key={s.product.id} first={i === 0}>
              <View style={[styles.dot, { backgroundColor: c.attention }]} />
              <Body style={{ flex: 1 }}>{productName(s.product)}</Body>
              <Body muted size={13}>{formatNum(s.onHand)} m left</Body>
            </Row>
          ))}
          {lowRaw.map((r, i) => (
            <Row key={r.id} first={low.length === 0 && i === 0}>
              <View style={[styles.dot, { backgroundColor: c.attention }]} />
              <Body style={{ flex: 1 }}>{r.name}</Body>
              <Body muted size={13}>{r.daysLeft} days left</Body>
            </Row>
          ))}
        </Card>
      ) : null}
      <MyTasks />
    </Screen>
  );
}

function SalesToday({ firstName }: { firstName: string }) {
  const c = useTheme();
  const { isOwner } = useAuth();
  const leads = useLeads();
  const quotes = useQuotes();
  const orders = useOrders();
  const stock = useFinishedStock();
  const raw = useRawStock();
  const prospects = useProspects();
  const invoices = useInvoices();
  const tasks = useTasks();
  const team = useTeam();
  const { profile } = useAuth();
  const uninvoiced = useUninvoiced();
  const [showAll, setShowAll] = useState(false);

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
    const today = addDaysIso(0);
    const dueProspects = (prospects.data ?? []).filter((x) => x.next_action_date && x.next_action_date <= today && x.status !== 'converted' && x.status !== 'dropped');
    if (dueProspects.length > 0) {
      needs.push({
        id: 'prospects',
        title: `${dueProspects.length} prospect${dueProspects.length === 1 ? '' : 's'} to contact`,
        detail: dueProspects.slice(0, 2).map((x) => x.name).join(', ') + (dueProspects.length > 2 ? '…' : ''),
        action: 'Open',
        tone: 'calm',
        go: () => router.push('/leads/prospects'),
        rank: 2.8,
      });
    }
    if (isOwner) {
      for (const t of (tasks.data ?? []).filter((x) => x.status === 'open' && x.assigned_to !== profile?.id && taskState(x).text === 'Overdue')) {
        needs.push({
          id: t.id,
          title: 'Task overdue',
          detail: `${t.title} · ${team.data?.find((p) => p.id === t.assigned_to)?.full_name ?? 'someone'}`,
          action: 'Open',
          tone: 'attention',
          go: () => router.push({ pathname: '/more/task', params: { id: t.id } }),
          rank: 2.4,
        });
      }
      for (const u of uninvoiced.data ?? []) {
        needs.push({
          id: u.despatch.id,
          title: 'Raise invoice',
          detail: `${u.party.name} · ${u.despatch.number} · ${formatNum(u.items.reduce((s, x) => s + x.metres, 0))} m`,
          action: 'Invoice',
          tone: 'calm',
          go: () => router.push({ pathname: '/money/new-invoice', params: { despatchId: u.despatch.id } }),
          rank: 1.3,
        });
      }
      for (const r of (invoices.data ?? []).filter(reminderDue)) {
        needs.push({
          id: r.invoice.id,
          title: r.daysOverdue > 0 ? `Payment overdue · ${r.daysOverdue} days` : 'Payment due soon',
          detail: `${r.party?.name ?? 'Customer'} · ${r.invoice.number} · ${formatInr(r.balance).replace(/\.00$/, '')}`,
          action: 'Remind',
          tone: r.daysOverdue > 0 ? 'attention' : 'calm',
          go: () => router.push({ pathname: '/money/invoice', params: { id: r.invoice.id } }),
          rank: r.daysOverdue > 0 ? 1.1 : 2.2,
        });
      }
      for (const b of orders.data ?? []) {
        const o = b.order;
        if (o.stage === 'dispatched' || o.stage === 'delivered' || o.stage === 'cancelled') continue;
        const left = b.items.reduce((s, i) => s + i.metres, 0) - b.despatches.reduce((s, d) => s + d.items.reduce((x, i) => x + i.metres, 0), 0);
        if (left > 0) {
          needs.push({
            id: o.id,
            title: 'Release despatch',
            detail: `${b.party?.name ?? 'Customer'} · ${o.number} · ${formatNum(left)} m to go`,
            action: 'Open',
            tone: 'calm',
            go: () => router.push({ pathname: '/orders/order', params: { id: o.id } }),
            rank: 1.2,
          });
        }
      }
      for (const s of (stock.data ?? []).filter((x) => x.low)) {
        needs.push({ id: s.product.id, title: 'Low stock', detail: `${productName(s.product)} · ${formatNum(s.onHand)} m left`, action: 'Factory', tone: 'attention', go: () => router.push('/factory'), rank: 2.5 });
      }
      for (const r of (raw.data ?? []).filter((x) => x.low)) {
        needs.push({ id: r.id, title: `${r.name} running low`, detail: `${r.daysLeft} days left at current use`, action: 'Factory', tone: 'attention', go: () => router.push('/factory'), rank: 2.6 });
      }
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
  }, [leads.data, quotes.data, orders.data, stock.data, raw.data, prospects.data, invoices.data, uninvoiced.data, tasks.data, team.data, profile?.id, isOwner]);

  const loading = leads.isLoading || quotes.isLoading;

  return (
    <Screen>
      <Header eyebrow={todayLabel()} title={`${greeting()}, ${firstName}`} />

      {isOwner ? <SetupCard /> : null}

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
          {(showAll ? view.needs : view.needs.slice(0, 8)).map((n, i) => (
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
      {view.needs.length > 8 ? <Button label={showAll ? 'Show fewer' : `Show all ${view.needs.length}`} variant="secondary" onPress={() => setShowAll((v) => !v)} /> : null}

    </Screen>
  );
}

/** First-week checklist for the owner. Disappears once the basics are in. */
function SetupCard() {
  const company = useCompany();
  const products = useProducts(true);
  const team = useTeam();
  if (!company.data || !products.data || !team.data) return null;
  const c = company.data;
  const steps = [
    { done: !!(c.phone && c.bank_account && c.quote_terms), title: 'Company details', detail: 'Phone, bank account and quote terms appear on every quote and invoice', go: '/more/company' },
    { done: products.data.some((p) => p.rate_per_kg != null && p.hsn_code), title: 'Products and rates', detail: 'Add your diameters, set a rate and the HSN code for each', go: '/more/products' },
    { done: team.data.some((t) => t.role !== 'owner' && t.active), title: 'Your team', detail: 'Add sales, despatch and factory people with their mobile numbers', go: '/more/team' },
  ];
  if (steps.every((x) => x.done)) return null;
  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>Get set up · {steps.filter((x) => x.done).length} of {steps.length} done</Body>
      {steps.map((x) => (
        <View key={x.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="medium" muted={x.done}>{x.done ? '✓ ' : ''}{x.title}</Body>
            {x.done ? null : <Body muted size={13}>{x.detail}</Body>}
          </View>
          {x.done ? null : <Button label="Open" size="small" variant="secondary" onPress={() => router.push(x.go as never)} />}
        </View>
      ))}
    </Card>
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
