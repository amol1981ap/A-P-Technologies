import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/calc';
import type { Task } from '@/lib/database.types';
import { useTeam } from '@/lib/queries';
import { taskState, uploadTaskProof, useTask, useTaskProofUrl, useUpdateTask } from '@/lib/tasks-queries';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, error } = useTask(id);
  if (error) return <ErrorText>{error.message}</ErrorText>;
  if (!data) return <Loading />;
  return <TaskView key={`${data.id}-${data.updated_at}`} t={data} />;
}

function TaskView({ t }: { t: Task }) {
  const { isOwner, profile } = useAuth();
  const team = useTeam();
  const update = useUpdateTask();
  const proof = useTaskProofUrl(t.proof_path);
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = isOwner || t.assigned_to === profile?.id;
  const st = taskState(t);
  const who = team.data?.find((p) => p.id === t.assigned_to)?.full_name ?? 'Someone';

  async function guarded(fn: () => Promise<void>) {
    setMsg('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    setMsg('');
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setMsg('Allow camera access in your phone settings to take the photo.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
    const res = Platform.OS === 'web' ? await ImagePicker.launchImageLibraryAsync(opts) : await ImagePicker.launchCameraAsync(opts);
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  }

  const markDone = () =>
    guarded(async () => {
      const path = photo ? await uploadTaskProof(t.id, photo) : t.proof_path;
      await update.mutateAsync({ id: t.id, status: 'done', proof_path: path, done_at: new Date().toISOString() });
      router.back();
    });

  const reopen = () => guarded(async () => void (await update.mutateAsync({ id: t.id, status: 'open', done_at: null })));

  return (
    <Screen nested>
      <Stack.Screen options={{ title: 'Task' }} />
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Body weight="semibold" size={18} style={{ flex: 1 }}>{t.title}</Body>
          <Chip tone={st.tone}>{st.text}</Chip>
        </View>
        {t.detail ? <Body>{t.detail}</Body> : null}
        <Body muted size={13}>For {who}{t.due_date ? ` · due ${formatDate(t.due_date)}` : ''}</Body>
        {t.status === 'done' && t.done_at ? <Body muted size={13}>Done {new Date(t.done_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Body> : null}
      </Card>

      {t.status === 'open' && mine ? (
        <Card style={{ gap: Spacing.three }}>
          {photo ? <Image source={{ uri: photo }} accessibilityLabel="Task photo" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} /> : null}
          <Button label={photo ? 'Retake photo' : 'Add a photo (optional)'} variant="secondary" onPress={takePhoto} />
          <ErrorText>{msg}</ErrorText>
          <Button label="Mark done" onPress={markDone} busy={busy} />
        </Card>
      ) : null}

      {t.status === 'done' ? (
        <>
          {proof.data ? (
            <Card style={{ gap: 8 }}>
              <Body weight="medium">Photo</Body>
              <Image source={{ uri: proof.data }} accessibilityLabel="Task proof photo" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} />
            </Card>
          ) : null}
          {isOwner ? <Button label="Reopen" variant="secondary" onPress={reopen} busy={busy} /> : null}
          <ErrorText>{msg}</ErrorText>
        </>
      ) : null}
      {!mine ? <Notice>This task is assigned to someone else.</Notice> : null}
    </Screen>
  );
}
