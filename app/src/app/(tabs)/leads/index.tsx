import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Card, Chip, Empty, ErrorText, Header, Loading, Screen, Segmented, type Tone } from '@/components/ui';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daysSince, formatInr, totals } from '@/lib/calc';
import type { Lead, LeadScore } from '@/lib/database.types';
import { followUpState } from '@/lib/followups';
import { LEAD_SOURCE_LABEL, QUOTE_STATUS_LABEL, useLeads, useQuotes, type QuoteListItem } from '@/lib/sales-queries';

type View_ = 'leads' | 'quotes';
type Filter = 'open' | LeadScore | 'closed';

const SCORE_TONE: Record<LeadScore, Tone> = { hot: 'attention', warm: 'calm', cold: 'neutral' };
const SCORE_LABEL: Record<LeadScore, string> = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };

export default function LeadsHome() {
  const c = useTheme();
  const [view, setView] = useState<View_>('leads');
  return (
    <Screen>
      <Header
        eyebrow="Sales"
        title={view === 'leads' ? 'Leads' : 'Quotes'}
        right={
          view === 'leads' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add lead"
              onPress={() => router.push('/leads/lead')}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.onPrimary, fontSize: 26, lineHeight: 28 }}>+</Text>
            </Pressable>
          ) : undefined
        }
      />
      <Segmented
        options={[
          { value: 'leads', label: 'Leads' },
          { value: 'quotes', label: 'Quotes' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'leads' ? <LeadList /> : <QuoteList />}
    </Screen>
  );
}

function LeadList() {
  const { data, isLoading, error } = useLeads();
  const [filter, setFilter] = useState<Filter>('open');

  const shown = useMemo(() => {
    const all = data ?? [];
    if (filter === 'open') return all.filter((l) => l.status !== 'won' && l.status !== 'lost');
    if (filter === 'closed') return all.filter((l) => l.status === 'won' || l.status === 'lost');
    return all.filter((l) => l.score === filter && l.status !== 'won' && l.status !== 'lost');
  }, [data, filter]);

  return (
    <>
      <Segmented
        options={[
          { value: 'open', label: 'Open' },
          { value: 'hot', label: 'Hot' },
          { value: 'warm', label: 'Warm' },
          { value: 'cold', label: 'Cold' },
          { value: 'closed', label: 'Closed' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && shown.length === 0 ? (
        <Empty
          title={data.length === 0 ? 'No leads yet' : 'Nothing here'}
          detail={data.length === 0 ? 'Tap + to add the first one. Website enquiries appear here automatically.' : undefined}
        />
      ) : null}
      {shown.map((l) => (
        <LeadCard key={l.id} lead={l} />
      ))}
    </>
  );
}

function LeadCard({ lead: l }: { lead: Lead }) {
  const c = useTheme();
  const age = daysSince(l.created_at);
  const next = l.status === 'new' ? 'New · quote it' : l.status === 'contacted' ? 'Contacted' : l.status === 'quoted' ? 'Quoted' : l.status === 'won' ? 'Won' : 'Lost';
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/leads/lead', params: { id: l.id } })}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={16}>{l.company || l.contact_name}</Body>
            <Body muted size={13}>
              {[l.company ? l.contact_name : null, l.project_type, l.location].filter(Boolean).join(' · ') || 'No details yet'}
            </Body>
            {l.quantity_note ? <Body muted size={13}>{l.quantity_note}</Body> : null}
          </View>
          {l.score ? <Chip tone={SCORE_TONE[l.score]}>{SCORE_LABEL[l.score]}</Chip> : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
          <Body muted size={12}>{LEAD_SOURCE_LABEL[l.source]} · {age === 0 ? 'today' : `${age} d ago`}</Body>
          <Body weight="medium" size={13} style={{ color: l.status === 'new' ? c.primaryText : c.textSecondary }}>{next}</Body>
        </View>
      </Card>
    </Pressable>
  );
}

function QuoteList() {
  const { data, isLoading, error } = useQuotes();
  const [filter, setFilter] = useState<'open' | 'closed'>('open');
  const shown = useMemo(() => {
    const all = data ?? [];
    return all.filter((q) => (filter === 'open' ? q.quote.status === 'draft' || q.quote.status === 'sent' : q.quote.status !== 'draft' && q.quote.status !== 'sent'));
  }, [data, filter]);

  return (
    <>
      <Segmented
        options={[
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && shown.length === 0 ? (
        <Empty title="No quotes here" detail={data.length === 0 ? 'Open a lead and tap Create quote.' : undefined} />
      ) : null}
      {shown.map((q) => (
        <QuoteCard key={q.quote.id} item={q} />
      ))}
    </>
  );
}

function QuoteCard({ item }: { item: QuoteListItem }) {
  const c = useTheme();
  const { quote: q, items } = item;
  const priced = items.length > 0 && items.every((i) => i.rate_per_m != null && i.gst_percent != null);
  const f = followUpState(q);
  const metres = items.reduce((s, i) => s + i.metres, 0);

  let status: { text: string; tone: Tone } = { text: QUOTE_STATUS_LABEL[q.status], tone: 'neutral' };
  if (q.status === 'draft') status = priced ? { text: 'Ready to send', tone: 'calm' } : { text: 'Needs rate', tone: 'attention' };
  if (q.status === 'sent' && f) {
    status = f.pastCycle
      ? { text: `Day ${f.age} · past cycle`, tone: 'attention' }
      : f.due
        ? { text: `Day ${f.age} · follow up`, tone: 'attention' }
        : { text: `Sent · day ${f.age}`, tone: 'calm' };
  }
  if (q.status === 'accepted') status = { text: 'Accepted', tone: 'calm' };

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/leads/quote', params: { id: q.id } })}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={16}>{item.customer}</Body>
            <Body muted size={13}>{q.number} · {items.length} item{items.length === 1 ? '' : 's'}{metres ? ` · ${metres.toLocaleString('en-IN')} m` : ''}</Body>
          </View>
          <Chip tone={status.tone}>{status.text}</Chip>
        </View>
        {priced ? (
          <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body muted size={12}>Total with GST</Body>
            <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: c.text, borderRadius: Radius.pill }}>{formatInr(totals(items).total)}</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
