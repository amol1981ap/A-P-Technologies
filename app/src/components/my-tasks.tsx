import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Card, Chip, Label, Row } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { taskState, useTasks } from '@/lib/tasks-queries';

/** The signed-in person's open tasks, most urgent first. Shown on every role's Today screen. */
export function MyTasks() {
  const { profile } = useAuth();
  const { data } = useTasks();
  const mine = (data ?? []).filter((t) => t.status === 'open' && t.assigned_to === profile?.id);
  if (mine.length === 0) return null;
  const sorted = [...mine].sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  return (
    <>
      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>My tasks · {mine.length}</Label>
      <Card style={{ paddingVertical: Spacing.one }}>
        {sorted.slice(0, 4).map((t, i) => {
          const st = taskState(t);
          return (
            <Row key={t.id} first={i === 0}>
              <View style={{ flex: 1, gap: 4 }}>
                <Body weight="semibold">{t.title}</Body>
                <Chip tone={st.tone}>{st.text}</Chip>
              </View>
              <Button label="Open" size="small" onPress={() => router.push({ pathname: '/more/task', params: { id: t.id } })} />
            </Row>
          );
        })}
      </Card>
    </>
  );
}
