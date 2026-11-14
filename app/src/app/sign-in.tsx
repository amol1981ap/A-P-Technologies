import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { OwnerSetup } from '@/components/owner-setup';
import { Body, Button, Card, ErrorText, Field, Screen, TextLink } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const c = useTheme();
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(false);

  if (setup) return <OwnerSetup onBack={() => setSetup(false)} />;

  async function submit() {
    setError('');
    setBusy(true);
    try {
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
        <View style={styles.brand}>
          <Text style={[styles.title, { color: c.text }]}>Control Centre</Text>
          <Body muted>A P Technologies · GFRP rebars</Body>
        </View>

        <Card style={{ gap: Spacing.three }}>
          <Field
            label="Mobile number or email"
            value={login}
            onChangeText={setLogin}
            placeholder="98XXXXXXXX"
            keyboard="email-address"
            autoCapitalize="none"
          />
          <Field label="Password" value={password} onChangeText={setPassword} secure autoCapitalize="none" />
          <ErrorText>{error}</ErrorText>
          <Button label="Sign in" onPress={submit} busy={busy} disabled={!login || !password} />
        </Card>

        <Body muted size={13} style={{ textAlign: 'center' }}>
          Forgot your password? Ask the owner to reset it.
        </Body>
        <TextLink label="First time? Set up the owner account" onPress={() => setSetup(true)} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 6, marginTop: Spacing.six, marginBottom: Spacing.four },
  title: { fontFamily: FontFamily.serif, fontSize: 40, lineHeight: 46 },
});
