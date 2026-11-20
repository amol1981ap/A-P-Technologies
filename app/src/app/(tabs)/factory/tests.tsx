import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ChipPicker, Empty, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addDaysIso, formatDate } from '@/lib/calc';
import { useProductionEntries } from '@/lib/ops-queries';
import { blankToNull } from '@/lib/queries';
import { COMMON_PROPERTIES, useBatchTests, useSaveBatchTest } from '@/lib/tests-queries';

export default function TestsScreen() {
  const { data, isLoading, error } = useBatchTests();
  const [adding, setAdding] = useState(false);
  return (
    <Screen nested>
      <Notice>Record the results from your lab report or in-house test. They print on the test certificate for every despatch that contains the batch.</Notice>
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && data.length === 0 && !adding ? <Empty title="No tests recorded yet" /> : null}
      {(data ?? []).map((t) => (
        <Card key={t.test.id} style={{ gap: 6 }}>
          <Body weight="semibold" size={16}>Batch {t.test.batch_no}</Body>
          <Body muted size={13}>{formatDate(t.test.tested_on)}{t.test.lab ? ` · ${t.test.lab}` : ''}{t.test.report_no ? ` · ${t.test.report_no}` : ''}</Body>
          {t.values.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Body size={14} style={{ flex: 1 }}>{v.property}</Body>
              <Body size={14} weight="medium">{v.value} {v.unit ?? ''}</Body>
            </View>
          ))}
        </Card>
      ))}
      {adding ? <NewTest onDone={() => setAdding(false)} /> : <Button label="Record a test" onPress={() => setAdding(true)} />}
    </Screen>
  );
}

type Row = { property: string; unit: string; value: string; requirement: string };

function NewTest({ onDone }: { onDone: () => void }) {
  const [since] = useState(() => addDaysIso(-120));
  const entries = useProductionEntries(since);
  const save = useSaveBatchTest();
  const [batch, setBatch] = useState<string | null>(null);
  const [date, setDate] = useState(addDaysIso(0));
  const [lab, setLab] = useState('');
  const [report, setReport] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>(COMMON_PROPERTIES.map((p) => ({ ...p, value: '', requirement: '' })));
  const [msg, setMsg] = useState('');
  if (!entries.data) return <Loading />;
  const batches = [...new Set(entries.data.map((e) => e.batch_no))];
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function submit() {
    setMsg('');
    if (!batch) return setMsg('Choose the batch.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return setMsg('Write the date as YYYY-MM-DD.');
    const values = rows.filter((r) => r.value.trim()).map((r) => ({ property: r.property.trim(), value: r.value.trim(), unit: blankToNull(r.unit), requirement: blankToNull(r.requirement) }));
    if (values.length === 0) return setMsg('Enter at least one result from the test.');
    try {
      await save.mutateAsync({ batch_no: batch, tested_on: date.trim(), lab: blankToNull(lab), report_no: blankToNull(report), notes: blankToNull(notes), values });
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>Record a test</Body>
      {batches.length === 0 ? <Notice>No production batches yet. Enter production first, then record its test.</Notice> : <ChipPicker label="Batch" options={batches.map((b) => ({ value: b, label: b }))} value={batch} onChange={setBatch} />}
      <Field label="Tested on" value={date} onChangeText={setDate} />
      <Field label="Lab (name, or In-house)" value={lab} onChangeText={setLab} autoCapitalize="words" />
      <Field label="Report number" value={report} onChangeText={setReport} autoCapitalize="characters" />
      <Label>Results. Leave blank any you did not test.</Label>
      {rows.map((r, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Body weight="medium">{r.property}</Body>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label={`${r.property}: result`} value={r.value} onChangeText={(v) => set(i, { value: v })} keyboard="decimal-pad" /></View>
            <View style={{ width: 70 }}><Field label={`${r.property}: unit`} value={r.unit} onChangeText={(v) => set(i, { unit: v })} /></View>
          </View>
          <Field label={`${r.property}: requirement`} value={r.requirement} onChangeText={(v) => set(i, { requirement: v })} placeholder="From the standard or your specification" />
        </View>
      ))}
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{msg}</ErrorText>
      <Button label="Save test" onPress={submit} busy={save.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
