import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Header, Screen, TextLink } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { loginToEmail } from '@/lib/login';
import { callFunction } from '@/lib/supabase';

export function OwnerSetup({ onBack }: { onBack: () => void }) {
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!loginToEmail(login)) return setError('Enter a 10-digit mobile number or a valid email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await callFunction('setup-owner', { code, full_name: name, login, password });
      await signIn(login, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header eyebrow="One-time setup" title="Owner account" />
        <Body muted>
          This creates the owner login. Only the owner can set rates, add team members and approve money. It works once.
        </Body>
        <Card style={{ gap: Spacing.three }}>
          <Field label="Setup code" value={code} onChangeText={setCode} autoCapitalize="none" hint="The code you saved in Supabase." />
          <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Mobile number or email" value={login} onChangeText={setLogin} keyboard="email-address" autoCapitalize="none" />
          <Field label="Password" value={password} onChangeText={setPassword} secure autoCapitalize="none" hint="At least 8 characters." />
          <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" />
          <ErrorText>{error}</ErrorText>
          <Button label="Create owner account" onPress={submit} busy={busy} disabled={!code || !name || !login || !password} />
        </Card>
        <TextLink label="Back to sign in" onPress={onBack} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
