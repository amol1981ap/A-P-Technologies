import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BigNumber, Body, Button, Card, ChipPicker, ErrorText, Field, Label, Loading, Notice, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/calc';
import type { LeadSource } from '@/lib/database.types';
import { groupBy, insight, monthKey, PERIOD_LABEL, periodStart, SOURCE_NAME, withSpend, type Period } from '@/lib/growth';
import { usePerformance, useSaveSpend, useSpend } from '@/lib/growth-queries';
import { useParties } from '@/lib/queries';

const lakh = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : formatInr(n).replace(/\.00$/, ''));

export function GrowthView() {
  const { isOwner } = useAuth();
  const perf = usePerformance();
  const spend = useSpend();
  const consultants = useParties('consultant');
  const [period, setPeriod] = useState<Period>('90');

  const view = useMemo(() => {
    const rows = perf.data ?? [];
    const start = periodStart(period);
    const bySource = withSpend(groupBy(rows, start, (r) => r.source), spend.data ?? [], start);
    const byCampaign = groupBy(rows, start, (r) => r.campaign).slice(0, 6);
    const byConsultant = groupBy(rows, start, (r) => r.influencer_id).slice(0, 5);
    const totals = bySource.reduce((t, s) => ({ leads: t.leads + s.leads, quoted: t.quoted + s.quoted, ordered: t.ordered + s.ordered, value: t.value + s.value, spend: t.spend + s.spend }), { leads: 0, quoted: 0, ordered: 0, value: 0, spend: 0 });
    return { bySource, byCampaign, byConsultant, totals };
  }, [perf.data, spend.data, period]);

  if (perf.isLoading) return <Loading />;
  const t = view.totals;
  const rate = t.leads > 0 ? Math.round((t.ordered / t.leads) * 100) : 0;
  const nameOf = (id: string) => consultants.data?.find((c) => c.id === id)?.name ?? 'Consultant';

  return (
    <>
      <Segmented options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} value={period} onChange={setPeriod} />
      <ErrorText>{perf.error?.message}</ErrorText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Card style={{ flexGrow: 1, flexBasis: 140, gap: 4 }}><Body muted size={13}>Leads</Body><BigNumber>{t.leads}</BigNumber><Body muted size={12}>{t.quoted} quoted</Body></Card>
        <Card style={{ flexGrow: 1, flexBasis: 140, gap: 4 }}><Body muted size={13}>Orders won</Body><BigNumber>{t.ordered}</BigNumber><Body muted size={12}>{rate}% of leads</Body></Card>
        <Card style={{ flexGrow: 1, flexBasis: 140, gap: 4 }}><Body muted size={13}>Order value</Body><BigNumber>{lakh(t.value)}</BigNumber><Body muted size={12}>before GST</Body></Card>
      </View>

      <Notice>{insight(view.bySource.filter((s) => s.leads > 0))}</Notice>

      <Label style={{ marginLeft: Spacing.one }}>By source</Label>
      {view.bySource.length === 0 ? <Card><Body muted>Leads will appear here as they come in.</Body></Card> : null}
      {view.bySource.map((s) => (
        <Card key={s.key} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Body weight="semibold" size={16} style={{ flex: 1 }}>{SOURCE_NAME[s.key as LeadSource] ?? s.key}</Body>
            {s.value > 0 ? <Body weight="semibold">{lakh(s.value)}</Body> : null}
          </View>
          <Body muted size={13}>{s.leads} {s.leads === 1 ? 'lead' : 'leads'} · {s.hot} hot · {s.quoted} quoted · {s.ordered} {s.ordered === 1 ? 'order' : 'orders'}</Body>
          {isOwner && s.spend > 0 ? (
            <Body size={13}>
              Spent {lakh(s.spend)}
              {s.leads > 0 ? ` · ${lakh(s.spend / s.leads)} per lead` : ''}
              {s.ordered > 0 ? ` · ${lakh(s.spend / s.ordered)} per order` : s.leads > 0 ? ' · no orders yet' : ''}
            </Body>
          ) : null}
        </Card>
      ))}

      {view.byCampaign.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>By campaign</Label>
          <Card style={{ gap: 10 }}>
            {view.byCampaign.map((c) => (
              <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Body style={{ flex: 1 }} weight="medium">{c.key}</Body>
                <Body muted size={13}>{c.leads} {c.leads === 1 ? 'lead' : 'leads'} · {c.ordered} {c.ordered === 1 ? 'order' : 'orders'}</Body>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {view.byConsultant.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Consultants who bring work</Label>
          <Card style={{ gap: 10 }}>
            {view.byConsultant.map((c) => (
              <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Body style={{ flex: 1 }} weight="medium">{nameOf(c.key)}</Body>
                <Body muted size={13}>{c.leads} {c.leads === 1 ? 'lead' : 'leads'} · {c.ordered} {c.ordered === 1 ? 'order' : 'orders'}{c.value > 0 ? ` · ${lakh(c.value)}` : ''}</Body>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Tools</Label>
      <Button label="Prospects to contact" variant="secondary" onPress={() => router.push('/leads/prospects')} />
      <Button label="Steel vs GFRP calculator" variant="secondary" onPress={() => router.push('/leads/calculator')} />
      {isOwner ? <SpendForm /> : null}
    </>
  );
}

function SpendForm() {
  const save = useSaveSpend();
  const [source, setSource] = useState<LeadSource | null>(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState('');

  async function submit() {
    setMsg('');
    setDone('');
    const a = Number(amount);
    if (!source) return setMsg('Choose where the money went.');
    if (amount.trim() === '' || !(a >= 0)) return setMsg('Enter the amount spent this month.');
    try {
      await save.mutateAsync({ month: monthKey(new Date()), source, amount: a, note: null });
      setAmount('');
      setDone(`Saved ${lakh(a)} for ${SOURCE_NAME[source]} this month.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>Add this month’s spend</Body>
      <Body muted size={13}>Only you see this. It gives the cost per lead and per order above. Saving again for the same source replaces the amount.</Body>
      <ChipPicker
        options={(['instagram', 'facebook', 'indiamart', 'whatsapp', 'other'] as LeadSource[]).map((s) => ({ value: s, label: SOURCE_NAME[s] }))}
        value={source}
        onChange={setSource}
      />
      <Field label="Amount spent (₹)" value={amount} onChangeText={setAmount} keyboard="decimal-pad" />
      <ErrorText>{msg}</ErrorText>
      {done ? <Notice>{done}</Notice> : null}
      <Button label="Save spend" onPress={submit} busy={save.isPending} />
    </Card>
  );
}
