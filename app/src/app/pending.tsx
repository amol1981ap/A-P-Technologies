import { Body, Button, Card, Header, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function PendingScreen() {
  const { signOut, refreshProfile } = useAuth();
  return (
    <Screen>
      <Header eyebrow="Almost there" title="Waiting for access" />
      <Card style={{ gap: Spacing.three }}>
        <Body>Your login works, but the owner has not given you access yet.</Body>
        <Body muted size={13}>Ask the owner to switch you on in More › Team, then tap Check again.</Body>
        <Button label="Check again" onPress={refreshProfile} />
        <Button label="Sign out" variant="secondary" onPress={signOut} />
      </Card>
    </Screen>
  );
}
