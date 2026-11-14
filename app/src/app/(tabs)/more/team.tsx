import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Field, Loading, Notice, Screen, Segmented, Toggle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ROLE_LABEL, useAuth } from '@/lib/auth';
import type { AppRole, Profile } from '@/lib/database.types';
import { loginToEmail } from '@/lib/login';
import { useTeam, useTeamAction } from '@/lib/queries';

type StaffRole = Exclude<AppRole, 'owner'>;
const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'despatch', label: 'Despatch' },
  { value: 'factory', label: 'Factory' },
];

const ROLE_HELP: Record<StaffRole, string> = {
  sales: 'Leads, quotes and orders. Cannot see or set rates.',
  despatch: 'Despatch slips for orders assigned to them.',
  factory: 'Daily production and stock.',
};

export default function TeamScreen() {
  const { data, isLoading, error } = useTeam();
  const { profile: me } = useAuth();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Screen nested>
      <Notice>People sign in with their mobile number and the password you set. Each person only sees their own work.</Notice>
      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>
      {data?.map((p) => (
        <Member key={p.id} member={p} isMe={p.id === me?.id} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
      ))}
      {adding ? <NewMember onDone={() => setAdding(false)} /> : <Button label="Add team member" onPress={() => setAdding(true)} />}
    </Screen>
  );
}

function Member({ member: m, isMe, open, onToggle }: { member: Profile; isMe: boolean; open: boolean; onToggle: () => void }) {
  const c = useTheme();
  const act = useTeamAction();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState('');

  async function run(body: Parameters<typeof act.mutateAsync>[0], success: string) {
    setMsg('');
    setDone('');
    try {
      await act.mutateAsync(body);
      setDone(success);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        disabled={isMe}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semibold" size={16}>{m.full_name || 'Unnamed'}{isMe ? ' (you)' : ''}</Body>
          <Body muted size={13}>{m.phone ?? ''}</Body>
        </View>
        <Chip tone={m.active ? 'calm' : 'neutral'}>{m.active ? ROLE_LABEL[m.role] : 'No access'}</Chip>
      </Pressable>

      {open && !isMe ? (
        <View style={{ gap: Spacing.three, borderTopWidth: 1, borderTopColor: c.line, paddingTop: Spacing.three }}>
          <Segmented
            label="Role"
            options={STAFF_ROLES}
            value={(m.role === 'owner' ? 'sales' : m.role) as StaffRole}
            onChange={(role) => run({ action: 'update', user_id: m.id, role }, 'Role updated.')}
          />
          <Toggle label="Can sign in" value={m.active} onChange={(active) => run({ action: 'update', user_id: m.id, active }, active ? 'Access on.' : 'Access off.')} />
          <Field label="New password" value={password} onChangeText={setPassword} secure autoCapitalize="none" hint="At least 8 characters. Tell them in person." />
          <Button
            label="Reset password"
            variant="secondary"
            disabled={password.length < 8}
            busy={act.isPending}
            onPress={() => run({ action: 'reset_password', user_id: m.id, password }, 'Password reset.').then(() => setPassword(''))}
          />
          <ErrorText>{msg}</ErrorText>
          {done ? <Notice>{done}</Notice> : null}
        </View>
      ) : null}
    </Card>
  );
}

function NewMember({ onDone }: { onDone: () => void }) {
  const act = useTeamAction();
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [role, setRole] = useState<StaffRole>('sales');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    if (!name.trim()) return setMsg('Enter their name.');
    if (!loginToEmail(login)) return setMsg('Enter a 10-digit mobile number or an email.');
    if (password.length < 8) return setMsg('Password must be at least 8 characters.');
    try {
      await act.mutateAsync({ action: 'create', full_name: name.trim(), login, password, role });
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>New team member</Body>
      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Mobile number (used to sign in)" value={login} onChangeText={setLogin} keyboard="phone-pad" autoCapitalize="none" />
      <Segmented label="Role" options={STAFF_ROLES} value={role} onChange={setRole} />
      <Body muted size={13}>{ROLE_HELP[role]}</Body>
      <Field label="Starting password" value={password} onChangeText={setPassword} secure autoCapitalize="none" hint="At least 8 characters." />
      <ErrorText>{msg}</ErrorText>
      <Button label="Add member" onPress={submit} busy={act.isPending} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
