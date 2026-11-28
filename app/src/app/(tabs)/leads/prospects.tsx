import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, Empty, ErrorText, Field, Loading, Notice, Screen, Segmented, type Tone } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addDaysIso, waNumber } from '@/lib/calc';
import type { Prospect, ProspectStatus } from '@/lib/database.types';
import { PROSPECT_STATUS_LABEL, useConvertProspect, useImportProspects, useProspects, useSaveProspect } from '@/lib/growth-queries';
import { previewProspectCsv, TEMPLATE_CSV, type ImportPreview } from '@/lib/prospect-import';
import { shareCsv } from '@/lib/quote-pdf';
import { blankToNull, useCompany } from '@/lib/queries';

const ROLES = ['Contractor', 'Developer / Builder', 'Consultant', 'Government', 'Dealer', 'Other'];
const SOURCES = ['NHAI / PWD award list', 'Tender notice', 'Site visit', 'Referral', 'LinkedIn', 'Other'];
const toOpts = (a: string[]) => a.map((v) => ({ value: v, label: v }));
const todayIso = () => addDaysIso(0);

type Filter = 'active' | 'converted' | 'dropped';
const STATUS_TONE: Record<ProspectStatus, Tone> = { new: 'neutral', contacted: 'calm', interested: 'calm', converted: 'calm', dropped: 'neutral' };

export default function ProspectsScreen() {
  const { data, isLoading, error } = useProspects();
  const [filter, setFilter] = useState<Filter>('active');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const shown = useMemo(() => {
    const all = data ?? [];
    if (filter === 'converted') return all.filter((p) => p.status === 'converted');
    if (filter === 'dropped') return all.filter((p) => p.status === 'dropped');
    return all.filter((p) => p.status !== 'converted' && p.status !== 'dropped');
  }, [data, filter]);

  return (
    <Screen nested>
      <Notice>People and companies worth approaching before they enquire. Find them in award lists, tender notices and site visits. Each opener is a message you send yourself.</Notice>
      <Segmented
        options={[
          { value: 'active', label: 'To contact' },
          { value: 'converted', label: 'Became leads' },
          { value: 'dropped', label: 'Dropped' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && shown.length === 0 && !adding ? <Empty title="Nothing here" detail={filter === 'active' ? 'Add the people you want to approach.' : undefined} /> : null}
      {shown.map((p) => (
        <ProspectCard key={p.id} p={p} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
      ))}
      {adding ? <NewProspect onDone={() => setAdding(false)} /> : <Button label="Add prospect" onPress={() => setAdding(true)} />}
      {importing ? (
        <ImportPanel existing={data ?? []} onDone={() => setImporting(false)} />
      ) : (
        <Button label="Import CSV" variant="secondary" onPress={() => setImporting(true)} />
      )}
    </Screen>
  );
}

function openerFor(p: Prospect, company: string) {
  const topic = p.project_note?.trim() || 'drainage, highway and coastal work';
  return `Hello ${p.name}, this is ${company}. We make GFRP rebars, a non-corrosive alternative to steel for ${topic}. May I send you a short technical note and test report? — ${company}`;
}

function ProspectCard({ p, open, onToggle }: { p: Prospect; open: boolean; onToggle: () => void }) {
  const company = useCompany().data?.name ?? 'A P Technologies';
  const save = useSaveProspect();
  const convert = useConvertProspect();
  const [msg, setMsg] = useState('');
  const due = p.next_action_date != null && p.next_action_date <= todayIso() && p.status !== 'converted' && p.status !== 'dropped';
  const wa = waNumber(p.phone);

  async function run(fn: () => Promise<unknown>) {
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const sendOpener = () =>
    run(async () => {
      await Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(openerFor(p, company))}`);
      await save.mutateAsync({ id: p.id, status: p.status === 'new' ? 'contacted' : p.status, last_contacted: todayIso(), next_action_date: addDaysIso(5) });
    });

  return (
    <Card style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semibold" size={16}>{p.name}</Body>
          <Body muted size={13}>{[p.organisation, p.role, p.location].filter(Boolean).join(' · ') || 'No details yet'}</Body>
          {p.project_note ? <Body muted size={13}>{p.project_note}</Body> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Chip tone={STATUS_TONE[p.status]}>{PROSPECT_STATUS_LABEL[p.status]}</Chip>
          {due ? <Chip tone="attention">Due</Chip> : null}
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: Spacing.three, borderTopWidth: 1, borderTopColor: '#EFEDE8', paddingTop: Spacing.three }}>
          {p.found_via ? <Body muted size={13}>Found via {p.found_via}{p.last_contacted ? ` · last contacted ${p.last_contacted}` : ''}</Body> : null}
          {wa ? (
            <>
              <Body muted size={13}>{openerFor(p, company)}</Body>
              <Button label="Send opener on WhatsApp" onPress={sendOpener} busy={save.isPending} />
            </>
          ) : (
            <Notice>Add a phone number to send an opener.</Notice>
          )}
          {p.phone ? <Button label="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
          {p.email ? <Button label={`Email ${p.email}`} variant="secondary" onPress={() => Linking.openURL(`mailto:${p.email}`)} /> : null}
          {p.permission ? <Body muted size={13}>They asked to hear from us.</Body> : null}
          {p.status !== 'converted' && p.status !== 'dropped' ? (
            <>
              <Segmented
                label="Where are they?"
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'contacted', label: 'Contacted' },
                  { value: 'interested', label: 'Interested' },
                ]}
                value={p.status as 'new' | 'contacted' | 'interested'}
                onChange={(status) => run(() => save.mutateAsync({ id: p.id, status }))}
              />
              <Button
                label="Make a lead"
                variant="secondary"
                busy={convert.isPending}
                onPress={() =>
                  run(async () => {
                    const id = await convert.mutateAsync(p);
                    router.push({ pathname: '/leads/lead', params: { id } });
                  })
                }
              />
              <Button label="Drop" variant="secondary" onPress={() => run(() => save.mutateAsync({ id: p.id, status: 'dropped' }))} />
            </>
          ) : null}
          <ErrorText>{msg}</ErrorText>
        </View>
      ) : null}
    </Card>
  );
}

function NewProspect({ onDone }: { onDone: () => void }) {
  const save = useSaveProspect();
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [via, setVia] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    if (!name.trim()) return setMsg('Enter a name.');
    if (phone.trim() && phone.replace(/\D/g, '').length < 10) return setMsg('Phone number should have 10 digits.');
    try {
      await save.mutateAsync({
        name: name.trim(),
        organisation: blankToNull(org),
        role,
        location: blankToNull(location),
        phone: blankToNull(phone),
        project_note: blankToNull(note),
        found_via: via,
        status: 'new',
        next_action_date: addDaysIso(1),
        last_contacted: null,
      });
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>New prospect</Body>
      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Company / department" value={org} onChangeText={setOrg} autoCapitalize="words" />
      <ChipPicker label="They are a" options={toOpts(ROLES)} value={role} onChange={setRole} />
      <Field label="Location" value={location} onChangeText={setLocation} autoCapitalize="words" />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboard="phone-pad" />
      <Field label="Project or interest" value={note} onChangeText={setNote} placeholder="NH-66 culverts, STP upgrade…" />
      <ChipPicker label="Found via" options={toOpts(SOURCES)} value={via} onChange={setVia} />
      <ErrorText>{msg}</ErrorText>
      <Button label="Add prospect" onPress={submit} busy={save.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}

function ImportPanel({ existing, onDone }: { existing: Prospect[]; onDone: () => void }) {
  const save = useImportProspects();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState('');

  async function pick() {
    setMsg('');
    setDone('');
    setPreview(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      const text = Platform.OS === 'web' && a.file ? await a.file.text() : await new File(a.uri).text();
      setFileName(a.name);
      setPreview(previewProspectCsv(text, existing));
    } catch (e) {
      setMsg(`Could not read that file: ${(e as Error).message}`);
    }
  }

  async function confirm() {
    if (!preview) return;
    setMsg('');
    try {
      const n = await save.mutateAsync(preview.fresh);
      setDone(`Added ${n} ${n === 1 ? 'contact' : 'contacts'} to To contact.`);
      setPreview(null);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>Import contacts from a CSV file</Body>
      <Body muted size={13}>Business contacts only: company numbers and work emails, from award lists, tender notices, meetings and enquiries. Do not import lists bought or copied in bulk from directories. You send each message yourself.</Body>
      <Button label="Get the CSV template" variant="secondary" onPress={() => shareCsv(TEMPLATE_CSV, 'prospects-template.csv').catch((e) => setMsg((e as Error).message))} />
      <Button label={preview ? 'Choose a different file' : 'Choose a CSV file'} variant="secondary" onPress={pick} />
      <ErrorText>{msg}</ErrorText>
      {done ? <Notice>{done}</Notice> : null}
      {preview ? (
        <View style={{ gap: Spacing.two }}>
          <Body weight="medium">{fileName}</Body>
          <Body>{preview.fresh.length} new · {preview.duplicates.length} already in your list · {preview.problems.length} {preview.problems.length === 1 ? 'problem' : 'problems'}</Body>
          {preview.duplicates.length > 0 ? <Body muted size={13}>Skipped as duplicates: {preview.duplicates.slice(0, 5).map((d) => d.name).join(', ')}{preview.duplicates.length > 5 ? '…' : ''}</Body> : null}
          {preview.problems.slice(0, 8).map((p) => (
            <Body key={`${p.line}-${p.text}`} size={13} style={{ color: '#8A4321' }}>Line {p.line}: {p.text}</Body>
          ))}
          {preview.problems.length > 8 ? <Body muted size={13}>…and {preview.problems.length - 8} more.</Body> : null}
          {preview.fresh.length > 0 ? <Button label={`Import ${preview.fresh.length} ${preview.fresh.length === 1 ? 'contact' : 'contacts'}`} onPress={confirm} busy={save.isPending} /> : <Notice>Nothing new to import.</Notice>}
        </View>
      ) : null}
      <Button label="Close" variant="secondary" onPress={onDone} />
    </Card>
  );
}
