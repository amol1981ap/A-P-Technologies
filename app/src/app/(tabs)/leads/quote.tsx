import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Chip, ChipPicker, ErrorText, Field, Label, Loading, Notice, Screen, type Tone } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { addDaysIso, formatDate, formatInr, formatNum, isPriced, lineKg, lineTaxable, totals, waNumber } from '@/lib/calc';
import type { CompanySettings, QuoteItem } from '@/lib/database.types';
import { FOLLOWUP_DAYS, followUpMessage, followUpState } from '@/lib/followups';
import { useCreateOrderFromQuote, useOrders } from '@/lib/ops-queries';
import { blankToNull, productName, useCompany, useProducts, type ProductWithRate } from '@/lib/queries';
import { quoteHtml, shareQuotePdf } from '@/lib/quote-pdf';
import {
  QUOTE_STATUS_LABEL,
  useAddItem,
  useDeleteItem,
  useQuote,
  useUpdateItem,
  useUpdateLead,
  useUpdateQuote,
  type QuoteListItem,
} from '@/lib/sales-queries';

export default function QuoteScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isOwner } = useAuth();
  const quote = useQuote(id);
  const products = useProducts(isOwner);
  const company = useCompany();

  if (quote.error) return <ErrorText>{quote.error.message}</ErrorText>;
  if (!quote.data || !products.data || !company.data) return <Loading />;

  const sig = quote.data.items.map((i) => `${i.id}:${i.metres}:${i.rate_per_kg}:${i.gst_percent}`).join('|');
  return (
    <QuoteView
      key={`${quote.data.quote.id}-${quote.data.quote.updated_at}-${sig}`}
      bundle={quote.data}
      products={products.data}
      company={company.data}
    />
  );
}

type Edit = { metres: string; rate: string; gst: string };

function QuoteView({ bundle, products, company }: { bundle: QuoteListItem; products: ProductWithRate[]; company: CompanySettings }) {
  const c = useTheme();
  const { isOwner } = useAuth();
  const { quote: q, items, party, lead, customer } = bundle;
  const byId = new Map(products.map((p) => [p.id, p]));
  const draft = q.status === 'draft';

  const updateQuote = useUpdateQuote();
  const updateItem = useUpdateItem();
  const addItem = useAddItem();
  const deleteItem = useDeleteItem();
  const updateLead = useUpdateLead();

  // Editable copies of each line. Owners start from the rate card when a line has no rate yet.
  const [edits, setEdits] = useState<Record<string, Edit>>(() =>
    Object.fromEntries(
      items.map((i) => {
        const card = byId.get(i.product_id);
        return [
          i.id,
          {
            metres: String(i.metres),
            rate: String(i.rate_per_kg ?? (isOwner ? card?.rate_per_kg ?? '' : '')),
            gst: String(i.gst_percent ?? (isOwner ? card?.gst_percent ?? '' : '')),
          },
        ];
      }),
    ),
  );
  const [newProduct, setNewProduct] = useState<string | null>(null);
  const [newMetres, setNewMetres] = useState('');
  const [terms, setTerms] = useState(q.terms ?? '');
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const parse = (s: string) => (s.trim() === '' ? null : Number(s));
  const edited = (i: QuoteItem) => edits[i.id] ?? { metres: String(i.metres), rate: '', gst: '' };

  const dirty =
    (terms.trim() || null) !== (q.terms?.trim() || null) ||
    items.some((i) => {
      const e = edited(i);
      return Number(e.metres) !== i.metres || (isOwner && (parse(e.rate) !== i.rate_per_kg || parse(e.gst) !== i.gst_percent));
    });

  // What the quote looks like with the edits applied.
  const lines = items.map((i) => {
    const e = edited(i);
    return { ...i, metres: Number(e.metres) || 0, rate_per_kg: isOwner ? parse(e.rate) : i.rate_per_kg, gst_percent: isOwner ? parse(e.gst) : i.gst_percent };
  });
  const ready = lines.length > 0 && lines.every((l) => l.metres > 0 && isPriced(l));
  const t = totals(ready ? lines : []);

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

  const saveChanges = () =>
    guarded(async () => {
      for (const l of lines) {
        if (!(l.metres > 0)) throw new Error('Metres must be more than zero.');
        if (isOwner) {
          if (l.rate_per_kg != null && !(l.rate_per_kg >= 0)) throw new Error('Enter a valid rate.');
          if (l.gst_percent != null && !(l.gst_percent >= 0 && l.gst_percent <= 28)) throw new Error('GST must be between 0 and 28.');
        }
      }
      for (const l of lines) {
        const orig = items.find((i) => i.id === l.id)!;
        const patch: Partial<Pick<QuoteItem, 'metres' | 'rate_per_kg' | 'gst_percent'>> = {};
        if (l.metres !== orig.metres) patch.metres = l.metres;
        if (isOwner && l.rate_per_kg !== orig.rate_per_kg) patch.rate_per_kg = l.rate_per_kg;
        if (isOwner && l.gst_percent !== orig.gst_percent) patch.gst_percent = l.gst_percent;
        if (Object.keys(patch).length) await updateItem.mutateAsync({ id: l.id, ...patch });
      }
      if ((terms.trim() || null) !== (q.terms?.trim() || null)) await updateQuote.mutateAsync({ id: q.id, terms: terms.trim() || null });
    });

  const add = () =>
    guarded(async () => {
      const m = Number(newMetres);
      if (!newProduct) throw new Error('Choose the diameter and surface.');
      if (!(m > 0)) throw new Error('Enter the metres.');
      const card = byId.get(newProduct);
      await addItem.mutateAsync({
        quote_id: q.id,
        product_id: newProduct,
        metres: m,
        ...(isOwner && card?.rate_per_kg != null ? { rate_per_kg: card.rate_per_kg, gst_percent: card.gst_percent } : {}),
      });
      setNewProduct(null);
      setNewMetres('');
    });

  function pdfHtml() {
    return quoteHtml({
      company,
      party,
      quote: q,
      items: lines.map((l) => {
        const p = byId.get(l.product_id)!;
        return { name: productName(p), diameter_mm: p.diameter_mm, metres: l.metres, kg_per_m: l.kg_per_m!, rate_per_kg: l.rate_per_kg!, gst_percent: l.gst_percent! };
      }),
    });
  }

  const sendQuote = () =>
    guarded(async () => {
      await shareQuotePdf(pdfHtml(), q.number);
      await updateQuote.mutateAsync({ id: q.id, status: 'sent' });
      if (lead && (lead.status === 'new' || lead.status === 'contacted')) await updateLead.mutateAsync({ id: lead.id, status: 'quoted' });
    });

  const sharePdf = () => guarded(() => shareQuotePdf(pdfHtml(), q.number));

  const f = followUpState(q);
  const phone = waNumber(party?.whatsapp || party?.phone || lead?.phone);

  const sendFollowUp = () =>
    guarded(async () => {
      if (f?.nextIndex == null) return;
      const text = followUpMessage({ index: f.nextIndex, customer: party?.contact_person || customer, number: q.number, validUntil: q.valid_until, company: company.name });
      await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
      await updateQuote.mutateAsync({ id: q.id, followups_done: q.followups_done + 1 });
    });

  const accept = () =>
    guarded(async () => {
      await updateQuote.mutateAsync({ id: q.id, status: 'accepted' });
      if (lead) await updateLead.mutateAsync({ id: lead.id, status: 'won' });
      router.back();
    });

  const reject = () =>
    guarded(async () => {
      await updateQuote.mutateAsync({ id: q.id, status: 'rejected', closed_reason: rejectReason.trim() });
      if (lead) await updateLead.mutateAsync({ id: lead.id, status: 'lost', lost_reason: rejectReason.trim() });
      router.back();
    });

  const backToDraft = () => guarded(async () => void (await updateQuote.mutateAsync({ id: q.id, status: 'draft', sent_at: null, followups_done: 0 })));

  const statusTone: Tone = draft ? 'neutral' : q.status === 'sent' ? 'calm' : q.status === 'accepted' ? 'calm' : 'neutral';

  return (
    <Screen nested>
      <Stack.Screen options={{ title: q.number }} />

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={18}>{customer}</Body>
            <Body muted size={13}>
              {[lead?.project_type, lead?.location].filter(Boolean).join(' · ') || 'Quotation'}
            </Body>
          </View>
          <Chip tone={statusTone}>{QUOTE_STATUS_LABEL[q.status]}</Chip>
        </View>
        {lead?.quantity_note ? <Body muted size={13}>Asked for: {lead.quantity_note}</Body> : null}
        {q.valid_until ? <Body muted size={13}>Valid until {formatDate(q.valid_until)}</Body> : null}
      </Card>

      {draft && !ready ? (
        <Notice>
          {items.length === 0
            ? 'Add the items this customer wants.'
            : isOwner
              ? 'Add your rate and GST on each line, then save.'
              : 'Waiting for the owner to set rates. You can add items and metres meanwhile.'}
        </Notice>
      ) : null}

      <Label style={{ marginLeft: Spacing.one }}>Items</Label>
      {items.length === 0 ? (
        <Card><Body muted>No items yet.</Body></Card>
      ) : (
        items.map((i) => {
          const p = byId.get(i.product_id);
          const e = edited(i);
          const line = lines.find((l) => l.id === i.id)!;
          const kg = lineKg(line);
          const amount = line.rate_per_kg != null ? lineTaxable(line) : null;
          return (
            <Card key={i.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Body weight="semibold" size={16} style={{ flex: 1 }}>{p ? productName(p) : 'Product'}</Body>
                {draft ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Remove item" hitSlop={8} onPress={() => guarded(async () => void (await deleteItem.mutateAsync(i.id)))}>
                    <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.attentionText }}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              {draft ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Metres" value={e.metres} onChangeText={(v) => setEdits((s) => ({ ...s, [i.id]: { ...edited(i), metres: v } }))} keyboard="decimal-pad" hint={`${formatNum(kg, 1)} kg`} />
                  </View>
                  {isOwner ? (
                    <>
                      <View style={{ flex: 1 }}>
                        <Field label="Rate ₹/kg" value={e.rate} onChangeText={(v) => setEdits((s) => ({ ...s, [i.id]: { ...edited(i), rate: v } }))} keyboard="decimal-pad" />
                      </View>
                      <View style={{ width: 84 }}>
                        <Field label="GST %" value={e.gst} onChangeText={(v) => setEdits((s) => ({ ...s, [i.id]: { ...edited(i), gst: v } }))} keyboard="decimal-pad" />
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                <Body muted>{formatNum(i.metres, 2)} m · {formatNum(kg, 1)} kg{i.rate_per_kg != null ? ` × ${formatInr(i.rate_per_kg)}/kg` : ''}</Body>
              )}
              {!isOwner && draft ? (
                i.rate_per_kg != null ? (
                  <Body muted size={13}>{formatNum(kg, 1)} kg · Rate {formatInr(i.rate_per_kg)}/kg · GST {i.gst_percent}%</Body>
                ) : (
                  <Chip tone="attention">Waiting for owner’s rate</Chip>
                )
              ) : null}
              {amount != null ? <Body weight="medium">{formatInr(amount)} <Body muted size={13}>before GST</Body></Body> : null}
            </Card>
          );
        })
      )}

      {draft ? (
        <Card style={{ gap: Spacing.three }}>
          <Body weight="semibold">Add an item</Body>
          <ChipPicker
            options={products.filter((p) => p.active).map((p) => ({ value: p.id, label: productName(p) }))}
            value={newProduct}
            onChange={setNewProduct}
          />
          {products.length === 0 ? <Body muted size={13}>No products yet. Add them in More › Products & rates.</Body> : null}
          <Field label="Metres" value={newMetres} onChangeText={setNewMetres} keyboard="decimal-pad" placeholder="8000" />
          <Button label="Add item" variant="secondary" onPress={add} disabled={!newProduct || !newMetres} />
        </Card>
      ) : null}

      {ready ? (
        <Card style={{ gap: 8 }}>
          <Row2 label="Taxable value" value={formatInr(t.taxable)} />
          <Row2 label="GST" value={formatInr(t.gst)} />
          <Row2 label="Total" value={formatInr(t.total)} bold />
        </Card>
      ) : null}

      {draft ? (
        <Card style={{ gap: Spacing.three }}>
          <Field label="Terms printed on the quote" value={terms} onChangeText={setTerms} multiline placeholder="Delivery, payment, validity, freight…" />
        </Card>
      ) : null}

      <ErrorText>{msg}</ErrorText>

      {draft ? (
        <>
          {dirty ? <Button label="Save changes" onPress={saveChanges} busy={busy} /> : null}
          <Button
            label="Send quote"
            variant={dirty ? 'secondary' : 'primary'}
            onPress={sendQuote}
            disabled={!ready || dirty}
            busy={busy && !dirty}
          />
          {dirty && ready ? <Body muted size={13} style={{ textAlign: 'center' }}>Save your changes first.</Body> : null}
        </>
      ) : null}

      {q.status === 'sent' && f ? (
        <>
          <Label style={{ marginLeft: Spacing.one }}>Follow-ups · sent {formatDate(q.sent_at)} · day {f.age}</Label>
          <Card style={{ gap: 12 }}>
            {FOLLOWUP_DAYS.map((d, idx) => {
              const done = idx < q.followups_done;
              const due = !done && f.age >= d;
              return (
                <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Body style={{ flex: 1 }} weight={due ? 'semibold' : 'regular'} muted={!due && !done}>Day {d}</Body>
                  <Chip tone={done ? 'calm' : due ? 'attention' : 'neutral'}>{done ? 'Done' : due ? 'Due now' : `in ${d - f.age} d`}</Chip>
                </View>
              );
            })}
            {f.pastCycle ? <Notice>Past the usual 10–15 day decision window. Call them.</Notice> : null}
            {f.nextIndex != null && f.due && phone ? <Button label={`Send day ${f.nextDay} follow-up`} onPress={sendFollowUp} busy={busy} /> : null}
            {!phone ? <Body muted size={13}>Add a phone number to the customer to send follow-ups on WhatsApp.</Body> : null}
          </Card>
          <Button label="Share quote PDF again" variant="secondary" onPress={sharePdf} busy={busy} />
          <Card style={{ gap: Spacing.three }}>
            <Body weight="semibold">Outcome</Body>
            <Button label="Customer accepted" onPress={accept} busy={busy} />
            <Field label="If not taken, why?" value={rejectReason} onChangeText={setRejectReason} placeholder="Price, chose steel, project dropped…" />
            <Button label="Not taken" variant="secondary" onPress={reject} disabled={!rejectReason.trim()} />
          </Card>
          <Pressable accessibilityRole="button" onPress={backToDraft} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.textSecondary }}>Not actually sent? Move back to draft</Text>
          </Pressable>
        </>
      ) : null}

      {q.status === 'accepted' || q.status === 'rejected' ? (
        <>
          <Notice>
            {q.status === 'accepted' ? 'Accepted by the customer.' : `Not taken${q.closed_reason ? `: ${q.closed_reason}` : ''}.`}
          </Notice>
          {q.status === 'accepted' ? <OrderFromQuote bundle={bundle} /> : null}
          <Button label="Share quote PDF" variant="secondary" onPress={sharePdf} busy={busy} />
        </>
      ) : null}
    </Screen>
  );
}

function Row2({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Body muted={!bold} weight={bold ? 'semibold' : 'regular'}>{label}</Body>
      <Body weight={bold ? 'semibold' : 'medium'} size={bold ? 17 : 15}>{value}</Body>
    </View>
  );
}


function OrderFromQuote({ bundle }: { bundle: QuoteListItem }) {
  const { isOwner } = useAuth();
  const { quote: q, party, lead } = bundle;
  const orders = useOrders();
  const create = useCreateOrderFromQuote();
  const existing = (orders.data ?? []).find((o) => o.order.quote_id === q.id);
  const [po, setPo] = useState('');
  const [site, setSite] = useState([party?.address, party?.city ?? lead?.location].filter(Boolean).join(', '));
  const [due, setDue] = useState(addDaysIso(12));
  const [msg, setMsg] = useState('');

  if (existing) {
    return (
      <Button label={`View order ${existing.order.number}`} onPress={() => router.push({ pathname: '/orders/order', params: { id: existing.order.id } })} />
    );
  }
  if (!isOwner) return <Notice>The owner creates the order once the customer’s PO is matched to this quote.</Notice>;
  if (!q.party_id) return null;

  async function submit() {
    setMsg('');
    if (due.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(due.trim())) return setMsg('Write the due date as YYYY-MM-DD, for example 2026-11-30.');
    try {
      const id = await create.mutateAsync({ quoteId: q.id, partyId: q.party_id!, poNumber: blankToNull(po), siteAddress: blankToNull(site), dueDate: blankToNull(due) });
      router.replace({ pathname: '/orders/order', params: { id } });
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Spacing.three }}>
      <Body weight="semibold" size={16}>Create order</Body>
      <Notice>Check the customer’s PO against this quote first. Creating the order confirms they match.</Notice>
      <Field label="Customer PO number" value={po} onChangeText={setPo} autoCapitalize="characters" />
      <Field label="Delivery address" value={site} onChangeText={setSite} multiline />
      <Field label="Due date" value={due} onChangeText={setDue} placeholder="2026-11-30" />
      <ErrorText>{msg}</ErrorText>
      <Button label="Create order" onPress={submit} busy={create.isPending} />
    </Card>
  );
}
