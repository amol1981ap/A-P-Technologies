import { View } from 'react-native';

import { BigNumber, Body, Button, Card, Chip, Header, Label, Row, SampleNote, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { dues, formatLakh, OVERDUE_DAYS } from '@/data/sample';

export default function MoneyScreen() {
  const total = dues.reduce((s, d) => s + d.amountLakh, 0);
  const overdue = dues.filter((d) => d.days > OVERDUE_DAYS);

  return (
    <Screen>
      <Header eyebrow="Receivables" title="Money" />

      <Card style={{ gap: 6 }}>
        <Body muted size={13}>Total bakaya</Body>
        <BigNumber tone={overdue.length ? 'attention' : undefined}>{formatLakh(total)}</BigNumber>
        <Body muted size={13}>
          {dues.length} parties · {overdue.length} over {OVERDUE_DAYS} days
        </Body>
      </Card>

      <Label style={{ marginTop: Spacing.two, marginLeft: Spacing.one }}>Oldest first</Label>
      <Card style={{ paddingVertical: Spacing.one }}>
        {[...dues]
          .sort((a, b) => b.days - a.days)
          .map((d, i) => (
            <Row key={d.party} first={i === 0}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="medium">{d.party}</Body>
                <Chip tone={d.days > OVERDUE_DAYS ? 'attention' : 'neutral'}>{`${d.days} days`}</Chip>
              </View>
              <Body weight="semibold">{formatLakh(d.amountLakh)}</Body>
            </Row>
          ))}
      </Card>

      <Body muted size={13} style={{ marginHorizontal: Spacing.one }}>
        Reminders are drafted in your words and sent only after you tap.
      </Body>
      <Button label="Review reminders" />

      <SampleNote />
    </Screen>
  );
}
