import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BigNumber, Body, Button, Card, Chip, Empty, ErrorText, Header, Label, Loading, Meter, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDate, formatInr, formatNum } from '@/lib/calc';
import { BAND_LABEL, BANDS, ageing, invoiceStatus, reminderDue } from '@/lib/ledger';
import { useInvoices, useUninvoiced } from '@/lib/money-queries';

const money = (n: number) => formatInr(n).replace(/\.00$/, '');

export default function MoneyHome() {
  const invoices = useInvoices();
  const todo = useUninvoiced();
  const rows = invoices.data ?? [];
  const a = ageing(rows);
  const collect = rows.filter(reminderDue);

  return (
    <Screen>
      <Header eyebrow="Receivables" title="Money" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Card style={{ flexGrow: 1, flexBasis: 150, gap: 4 }}>
          <Body muted size={13}>Total bakaya</Body>
          <BigNumber>{money(a.total)}</BigNumber>
          <Body muted size={12}>{a.open.length} open invoice{a.open.length === 1 ? '' : 's'}</Body>
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 150, gap: 4 }}>
          <Body muted size={13}>Overdue</Body>
          <BigNumber tone={a.overdue > 0 ? 'attention' : undefined}>{money(a.overdue)}</BigNumber>
          <Body muted size={12}>past the due date</Body>
        </Card>
      </View>
      {invoices.isLoading ? <Loading /> : null}
      <ErrorText>{invoices.error?.message}</ErrorText>

      {(todo.data ?? []).length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>To invoice · {todo.data!.length}</Label>
          <Card style={{ paddingVertical: Spacing.one }}>
            {todo.data!.map((u, i) => (
              <Row key={u.despatch.id} first={i === 0}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="semibold">{u.party.name}</Body>
                  <Body muted size={13}>{u.despatch.number} · {formatNum(u.items.reduce((s, x) => s + x.metres, 0))} m · {u.despatch.status === 'delivered' ? 'delivered' : 'on its way'}</Body>
                </View>
                <Button label="Invoice" size="small" onPress={() => router.push({ pathname: '/money/new-invoice', params: { despatchId: u.despatch.id } })} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {collect.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Time to remind · {collect.length}</Label>
          <Card style={{ paddingVertical: Spacing.one }}>
            {collect.map((r, i) => (
              <Row key={r.invoice.id} first={i === 0}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="semibold">{r.party?.name ?? 'Customer'}</Body>
                  <Body muted size={13}>{r.invoice.number} · {money(r.balance)} · {r.daysOverdue > 0 ? `${r.daysOverdue} days late` : `due ${formatDate(r.invoice.due_date)}`}</Body>
                </View>
                <Button label="Remind" size="small" variant={r.daysOverdue > 0 ? 'urgent' : 'primary'} onPress={() => router.push({ pathname: '/money/invoice', params: { id: r.invoice.id } })} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Bakaya by age</Label>
      <Card style={{ gap: 12 }}>
        {BANDS.map((b) => (
          <View key={b} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Body size={14}>{BAND_LABEL[b]}</Body>
              <Body weight="semibold" size={14}>{money(a.bands[b])}</Body>
            </View>
            <Meter value={a.total > 0 ? a.bands[b] / a.total : 0} tone={b === 'notdue' || b === 'd30' ? 'calm' : 'attention'} />
          </View>
        ))}
      </Card>

      {a.parties.length > 0 ? (
        <>
          <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Who owes you</Label>
          <Card style={{ paddingVertical: Spacing.one }}>
            {a.parties.map((p, i) => (
              <Row key={p.party?.id ?? i} first={i === 0}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="medium">{p.party?.name ?? 'Customer'}</Body>
                  <Body muted size={12}>{p.count} invoice{p.count === 1 ? '' : 's'}{p.oldest > 0 ? ` · oldest ${p.oldest} days late` : ''}</Body>
                </View>
                <Body weight="semibold">{money(p.balance)}</Body>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Invoices</Label>
      {invoices.data && rows.length === 0 ? <Empty title="No invoices yet" detail="Once a despatch is released, it appears under To invoice." /> : null}
      {rows.slice(0, 15).map((r) => {
        const st = invoiceStatus(r);
        return (
          <Pressable key={r.invoice.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/money/invoice', params: { id: r.invoice.id } })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="semibold">{r.party?.name ?? 'Customer'}</Body>
                <Body muted size={13}>{r.invoice.number ?? 'Draft'} · {formatDate(r.invoice.invoice_date)}</Body>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Body weight="semibold">{money(r.invoice.total)}</Body>
                <Chip tone={st.tone}>{st.text}</Chip>
              </View>
            </Card>
          </Pressable>
        );
      })}

      <Button label="GST sheet for your CA" variant="secondary" onPress={() => router.push('/money/gst')} />
    </Screen>
  );
}
