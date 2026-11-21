import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Card, Chip, Header, Label, LinkRow, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ROLE_LABEL, useAuth } from '@/lib/auth';
import { displayLogin } from '@/lib/login';

export default function MoreScreen() {
  const { profile, session, role, isOwner, signOut } = useAuth();
  const canSeeParties = role === 'owner' || role === 'sales' || role === 'despatch';

  return (
    <Screen>
      <Header title="More" />

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semibold" size={17}>{profile?.full_name || 'You'}</Body>
          <Body muted size={13}>{displayLogin(session?.user.email)}</Body>
        </View>
        {role ? <Chip>{ROLE_LABEL[role]}</Chip> : null}
      </Card>

      <Card style={{ paddingVertical: Spacing.one, marginTop: Spacing.two }}>
        <LinkRow first title={isOwner ? 'Tasks' : 'My tasks'} detail={isOwner ? 'Give your team tasks with due dates and photo proof' : 'What the owner has asked you to do'} onPress={() => router.push('/more/tasks')} />
      </Card>

      <Label style={{ marginTop: Spacing.two, marginLeft: Spacing.one }}>Business setup</Label>
      <Card style={{ paddingVertical: Spacing.one }}>
        <LinkRow
          first
          title="Products & rates"
          detail={isOwner ? 'Diameters, surfaces and your rate card' : 'Diameters and surfaces'}
          onPress={() => router.push('/more/products')}
        />
        {canSeeParties ? (
          <LinkRow title="Parties" detail="Customers, consultants, suppliers, transporters" onPress={() => router.push('/more/parties')} />
        ) : null}
        <LinkRow title="Company details" detail="Name, GSTIN, address, bank" onPress={() => router.push('/more/company')} />
        {isOwner ? <LinkRow title="Team" detail="Add people and set what they can see" onPress={() => router.push('/more/team')} /> : null}
      </Card>

      <Card style={{ paddingVertical: Spacing.one, marginTop: Spacing.two }}>
        <LinkRow first title="Change password" detail="Pick a new password for your login" onPress={() => router.push('/more/password')} />
      </Card>

      <View style={{ marginTop: Spacing.three }}>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}
