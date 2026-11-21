import { useState } from 'react';

import { Body, Button, Card, ErrorText, Field, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function PasswordScreen() {
  const { session } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  async function save() {
    setMsg('');
    setDone(false);
    if (next.length < 8) return setMsg('The new password must be at least 8 characters.');
    if (next !== confirm) return setMsg('The two new passwords do not match.');
    setBusy(true);
    try {
      // Check the current password first, so a phone left unlocked cannot quietly change it.
      const check = await supabase.auth.signInWithPassword({ email: session?.user.email ?? '', password: current });
      if (check.error) throw new Error('Your current password is not correct.');
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(error.message);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen nested>
      <Body muted>Use at least 8 characters. Nobody else, including the owner, can see your password.</Body>
      <Card style={{ gap: Spacing.three }}>
        <Field label="Current password" value={current} onChangeText={setCurrent} secure autoCapitalize="none" />
        <Field label="New password" value={next} onChangeText={setNext} secure autoCapitalize="none" />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" />
        <ErrorText>{msg}</ErrorText>
        {done ? <Notice>Password changed.</Notice> : null}
        <Button label="Change password" onPress={save} busy={busy} disabled={!current || !next || !confirm} />
      </Card>
    </Screen>
  );
}
