import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, Empty, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { addDaysIso } from '@/lib/calc';
import type { Task } from '@/lib/database.types';
import { useTeam, blankToNull } from '@/lib/queries';
import { taskState, useCreateTask, useTasks } from '@/lib/tasks-queries';

export default function TasksScreen() {
  const { isOwner } = useAuth();
  const { data, isLoading, error } = useTasks();
  const team = useTeam();
  const [adding, setAdding] = useState(false);
  const name = (id: string) => team.data?.find((t) => t.id === id)?.full_name ?? 'Someone';

  const { open, done } = useMemo(() => {
    const all = data ?? [];
    return { open: all.filter((t) => t.status === 'open'), done: all.filter((t) => t.status === 'done').slice(0, 15) };
  }, [data]);

  return (
    <Screen nested>
      {!isOwner ? <Notice>Tasks the owner gave you. Tap one to mark it done, with a photo if it helps.</Notice> : null}
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data && open.length === 0 && !adding ? <Empty title="No open tasks" detail={isOwner ? 'Give someone a task below.' : 'Nothing to do right now.'} /> : null}
      {open.map((t) => (
        <TaskCard key={t.id} t={t} who={isOwner ? name(t.assigned_to) : null} />
      ))}
      {done.length > 0 ? <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Done recently</Label> : null}
      {done.map((t) => (
        <TaskCard key={t.id} t={t} who={isOwner ? name(t.assigned_to) : null} />
      ))}
      {isOwner ? adding ? <NewTask onDone={() => setAdding(false)} /> : <Button label="Give a task" onPress={() => setAdding(true)} /> : null}
    </Screen>
  );
}

function TaskCard({ t, who }: { t: Task; who: string | null }) {
  const st = taskState(t);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/more/task', params: { id: t.id } })}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semibold" size={16}>{t.title}</Body>
          {who ? <Body muted size={13}>For {who}</Body> : null}
          {t.detail ? <Body muted size={13} >{t.detail}</Body> : null}
        </View>
        <Chip tone={st.tone}>{st.text}</Chip>
      </Card>
    </Pressable>
  );
}

function NewTask({ onDone }: { onDone: () => void }) {
  const team = useTeam();
  const create = useCreateTask();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [who, setWho] = useState<string | null>(null);
  const [due, setDue] = useState(addDaysIso(2));
  const [msg, setMsg] = useState('');
  const people = (team.data ?? []).filter((t) => t.active);
  if (!team.data) return <Loading />;

  async function submit() {
    setMsg('');
    if (!title.trim()) return setMsg('Write what needs doing.');
    if (!who) return setMsg('Choose who it is for.');
    if (due.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(due.trim())) return setMsg('Write the date as YYYY-MM-DD.');
    try {
      await create.mutateAsync({ title: title.trim(), detail: blankToNull(detail), assigned_to: who, due_date: blankToNull(due) });
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>New task</Body>
      <Field label="What needs doing" value={title} onChangeText={setTitle} />
      <Field label="Details (optional)" value={detail} onChangeText={setDetail} multiline />
      <ChipPicker label="For" options={people.map((p) => ({ value: p.id, label: p.full_name || 'Unnamed' }))} value={who} onChange={setWho} />
      <Field label="Due on" value={due} onChangeText={setDue} placeholder="2026-11-30" />
      <ErrorText>{msg}</ErrorText>
      <Button label="Give task" onPress={submit} busy={create.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
