import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ChipPicker, ErrorText, Loading, Notice, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatInr } from '@/lib/calc';
import type { LeadSource } from '@/lib/database.types';
import { funnel, funnelInsight, PERIOD_LABEL, periodStart, SOURCE_NAME, type Period } from '@/lib/growth';
import { usePerformance } from '@/lib/growth-queries';
import { useLeads } from '@/lib/sales-queries';

/** The lead funnel: enquiry, contacted, quoted, ordered. Nothing else. */
export function FunnelView() {
  const c = useTheme();
  const perf = usePerformance();
  const [period, setPeriod] = useState<Period>('90');
  const [source, setSource] = useState<LeadSource | 'all'>('all');

  const view = useMemo(() => {
    const rows = perf.data ?? [];
    const flow = funnel(rows, periodStart(period), source === 'all' ? null : source);
    const sources = [...new Set(rows.filter((r) => r.source).map((r) => r.source as LeadSource))];
    return { flow, sources };
  }, [perf.data, period, source]);

  if (perf.isLoading) return <Loading />;
  const top = view.flow.stages[0].count;

  return (
    <>
      <Segmented options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} value={period} onChange={setPeriod} />
      <ErrorText>{perf.error?.message}</ErrorText>

      <Card style={{ gap: Spacing.three }}>
        {view.sources.length > 1 ? (
          <ChipPicker
            options={[{ value: 'all' as LeadSource | 'all', label: 'All sources' }, ...view.sources.map((s) => ({ value: s as LeadSource | 'all', label: SOURCE_NAME[s] }))]}
            value={source}
            onChange={setSource}
          />
        ) : null}
        {view.flow.stages.map((st, i) => (
          <View key={st.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Body weight="medium" style={{ flex: 1 }}>{st.label}</Body>
              <Body weight="semibold" size={17}>{st.count}</Body>
              <Body muted size={12} style={{ width: 104, textAlign: 'right' }}>
                {st.ofPrev == null ? 'all enquiries' : `${st.ofPrev}% of ${view.flow.stages[i - 1].label.toLowerCase()}`}
              </Body>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden' }}>
              <View style={{ height: 10, borderRadius: 5, width: `${top > 0 ? Math.max(st.count > 0 ? 3 : 0, st.ofStart) : 0}%`, backgroundColor: c.primary }} />
            </View>
          </View>
        ))}
        <Notice>{funnelInsight(view.flow.stages)}</Notice>
        <Body muted size={13}>
          {view.flow.lost > 0 ? `${view.flow.lost} marked lost. ` : ''}
          {view.flow.value > 0 ? `Order value ${formatInr(view.flow.value).replace(/\.00$/, '')} before GST.` : ''}
        </Body>
      </Card>

      <WaitingLeads />
    </>
  );
}

/** New enquiries nobody has picked up for a day: the biggest early leak in any funnel. */
function WaitingLeads() {
  const leads = useLeads();
  const [cutoff] = useState(() => Date.now() - 86400000);
  const waiting = (leads.data ?? []).filter((l) => l.status === 'new' && new Date(l.created_at).getTime() < cutoff);
  if (waiting.length === 0) return null;
  return (
    <Card style={{ gap: 10 }}>
      <Body weight="semibold" size={16}>{waiting.length} {waiting.length === 1 ? 'enquiry has' : 'enquiries have'} waited over a day</Body>
      {waiting.slice(0, 3).map((l) => (
        <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Body style={{ flex: 1 }} weight="medium">{l.company || l.contact_name}</Body>
          <Button label="Open" size="small" onPress={() => router.push({ pathname: '/leads/lead', params: { id: l.id } })} />
        </View>
      ))}
    </Card>
  );
}
