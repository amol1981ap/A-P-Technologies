import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, ErrorText, Field, Label, Loading, Notice, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { waNumber } from '@/lib/calc';
import type { Lead, LeadScore, LeadSource } from '@/lib/database.types';
import { blankToNull, useCompany } from '@/lib/queries';
import { scoreLead } from '@/lib/scoring';
import {
  LEAD_SOURCE_LABEL,
  QUOTE_STATUS_LABEL,
  useCreateQuoteFromLead,
  useLead,
  useQuotes,
  useSaveLead,
  useUpdateLead,
} from '@/lib/sales-queries';

const ROLES = ['Contractor', 'Developer / Builder', 'Consultant', 'Government', 'Dealer', 'Other'];
const PROJECTS = ['Highway / NHAI', 'Drainage', 'Sewage / STP', 'Coastal', 'Industrial flooring', 'Building', 'Other'];
const SOURCES = (Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((s) => ({ value: s, label: LEAD_SOURCE_LABEL[s] }));
const toOpts = (a: string[]) => a.map((v) => ({ value: v, label: v }));

export default function LeadScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useLead(id);
  if (id && (isLoading || !existing)) return <Loading />;
  return <LeadForm key={existing?.id ?? 'new'} existing={existing ?? null} />;
}

function LeadForm({ existing }: { existing: Lead | null }) {
  const save = useSaveLead();
  const update = useUpdateLead();
  const createQuote = useCreateQuoteFromLead();
  const company = useCompany();
  const quotes = useQuotes();

  const [name, setName] = useState(existing?.contact_name ?? '');
  const [org, setOrg] = useState(existing?.company ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [role, setRole] = useState<string | null>(existing?.buyer_role ?? null);
  const [project, setProject] = useState<string | null>(existing?.project_type ?? null);
  const [location, setLocation] = useState(existing?.location ?? '');
  const [qty, setQty] = useState(existing?.quantity_note ?? '');
  const [source, setSource] = useState<LeadSource>(existing?.source ?? 'phone');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [score, setScore] = useState<LeadScore | 'auto'>(existing?.score ?? 'auto');
  const [lostReason, setLostReason] = useState('');
  const [msg, setMsg] = useState('');

  const closed = existing?.status === 'won' || existing?.status === 'lost';
  const myQuotes = (quotes.data ?? []).filter((q) => q.quote.lead_id === existing?.id);

  async function submit() {
    setMsg('');
    if (!name.trim()) return setMsg('Enter the contact name.');
    if (phone.trim() && phone.replace(/\D/g, '').length < 10) return setMsg('Phone number should have 10 digits.');
    const fields = {
      contact_name: name.trim(),
      company: blankToNull(org),
      phone: blankToNull(phone),
      buyer_role: role,
      project_type: project,
      location: blankToNull(location),
      quantity_note: blankToNull(qty),
      notes: blankToNull(notes),
      source,
    };
    try {
      await save.mutateAsync({
        id: existing?.id,
        ...fields,
        score: score === 'auto' ? scoreLead(fields) : score,
        status: existing?.status ?? 'new',
        next_follow_up: existing?.next_follow_up ?? null,
      });
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function startQuote() {
    if (!existing) return;
    setMsg('');
    try {
      const q = await createQuote.mutateAsync({ lead: existing, terms: company.data?.quote_terms ?? null });
      router.push({ pathname: '/leads/quote', params: { id: q.id } });
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function setStatus(status: Lead['status'], reason?: string) {
    if (!existing) return;
    setMsg('');
    try {
      await update.mutateAsync({ id: existing.id, status, lost_reason: reason ?? null });
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const wa = waNumber(existing?.phone ?? phone);

  return (
    <Screen nested>
      <Stack.Screen options={{ title: existing ? existing.company || existing.contact_name : 'New lead' }} />

      {existing ? (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Chip tone={existing.status === 'lost' ? 'neutral' : 'calm'}>{existing.status === 'new' ? 'New' : existing.status === 'contacted' ? 'Contacted' : existing.status === 'quoted' ? 'Quoted' : existing.status === 'won' ? 'Won' : 'Lost'}</Chip>
            <Body muted size={13}>{LEAD_SOURCE_LABEL[existing.source]}</Body>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {existing.phone ? (
              <View style={{ flex: 1 }}>
                <Button label="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${existing.phone}`)} />
              </View>
            ) : null}
            {wa ? (
              <View style={{ flex: 1 }}>
                <Button label="WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${wa}`)} />
              </View>
            ) : null}
          </View>
          {!closed && myQuotes.length === 0 ? <Button label="Create quote" onPress={startQuote} busy={createQuote.isPending} /> : null}
        </Card>
      ) : null}

      {myQuotes.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one }}>Quotes for this lead</Label>
          <Card style={{ gap: 10 }}>
            {myQuotes.map((q) => (
              <View key={q.quote.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Body weight="medium">{q.quote.number}</Body>
                </View>
                <Chip tone="neutral">{QUOTE_STATUS_LABEL[q.quote.status]}</Chip>
                <Button label="Open" size="small" variant="secondary" onPress={() => router.push({ pathname: '/leads/quote', params: { id: q.quote.id } })} />
              </View>
            ))}
            {!closed ? <Button label="New quote" size="small" variant="secondary" onPress={startQuote} busy={createQuote.isPending} /> : null}
          </Card>
        </>
      ) : null}

      <Label style={{ marginLeft: Spacing.one }}>Who</Label>
      <Card style={{ gap: Spacing.three }}>
        <Field label="Contact name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Company" value={org} onChangeText={setOrg} autoCapitalize="words" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboard="phone-pad" />
        <ChipPicker label="They are a" options={toOpts(ROLES)} value={role} onChange={setRole} />
      </Card>

      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Project</Label>
      <Card style={{ gap: Spacing.three }}>
        <ChipPicker label="Type" options={toOpts(PROJECTS)} value={project} onChange={setProject} />
        <Field label="Location" value={location} onChangeText={setLocation} autoCapitalize="words" placeholder="City, State" />
        <Field label="Quantity" value={qty} onChangeText={setQty} placeholder="e.g. 8,000 m of 12 mm" />
        <ChipPicker label="Came from" options={SOURCES} value={source} onChange={setSource} />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        <Segmented
          label="Priority"
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'hot', label: 'Hot' },
            { value: 'warm', label: 'Warm' },
            { value: 'cold', label: 'Cold' },
          ]}
          value={score}
          onChange={setScore}
        />
        <Body muted size={12}>Auto scores Hot when we know the buyer type, project, place and quantity.</Body>
      </Card>

      <ErrorText>{msg}</ErrorText>
      <Button label={existing ? 'Save changes' : 'Add lead'} onPress={submit} busy={save.isPending} />

      {existing && !closed ? (
        <>
          {existing.status === 'new' ? (
            <Button label="Mark as contacted" variant="secondary" onPress={() => setStatus('contacted')} busy={update.isPending} />
          ) : null}
          <Card style={{ gap: Spacing.three }}>
            <Body weight="semibold">Close this lead</Body>
            <Button label="Mark as won" variant="secondary" onPress={() => setStatus('won')} />
            <Field label="Why was it lost?" value={lostReason} onChangeText={setLostReason} placeholder="Price, went with steel, no project…" />
            <Button label="Mark as lost" variant="secondary" disabled={!lostReason.trim()} onPress={() => setStatus('lost', lostReason.trim())} />
          </Card>
        </>
      ) : null}
      {existing?.status === 'lost' && existing.lost_reason ? <Notice>Lost: {existing.lost_reason}</Notice> : null}
    </Screen>
  );
}
