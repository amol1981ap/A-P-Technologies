import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { CompanySettings } from '@/lib/database.types';
import { blankToNull, GSTIN_PATTERN, useCompany, useSaveCompany } from '@/lib/queries';

const KEYS = ['name', 'gstin', 'address', 'city', 'state', 'state_code', 'phone', 'whatsapp', 'email', 'bank_name', 'bank_account', 'bank_ifsc', 'quote_terms'] as const;
type Key = (typeof KEYS)[number];
type Form = Record<Key, string>;

export default function CompanyScreen() {
  const { data, isLoading, error } = useCompany();
  if (error) return <ErrorText>{error.message}</ErrorText>;
  if (isLoading || !data) return <Loading />;
  return <CompanyForm data={data} />;
}

function CompanyForm({ data }: { data: CompanySettings }) {
  const { isOwner } = useAuth();
  const save = useSaveCompany();
  const [f, setF] = useState<Form>(
    () => Object.fromEntries(KEYS.map((k) => [k, (data[k as keyof CompanySettings] as string | null) ?? ''])) as Form,
  );
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (k: Key) => (v: string) => {
    setSaved(false);
    setF((prev) => ({ ...prev, [k]: v }));
  };

  async function submit() {
    setMsg('');
    const gstin = f.gstin.trim().toUpperCase();
    if (gstin && !GSTIN_PATTERN.test(gstin)) return setMsg('GSTIN should be 15 characters, like 27ABCDE1234F1Z5.');
    if (!f.name.trim()) return setMsg('Enter the company name.');
    try {
      await save.mutateAsync({
        ...Object.fromEntries(KEYS.map((k) => [k, blankToNull(f[k])])),
        name: f.name.trim(),
        gstin: gstin || null,
        // GSTIN starts with the state code.
        state_code: blankToNull(f.state_code) ?? (gstin ? gstin.slice(0, 2) : null),
      });
      setSaved(true);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const e = isOwner;
  return (
    <Screen nested>
      {!isOwner ? <Notice>Only the owner can change these details.</Notice> : null}
      <Label style={{ marginLeft: Spacing.one }}>Business</Label>
      <Card style={{ gap: Spacing.three }}>
        <Field label="Company name" value={f.name} onChangeText={set('name')} editable={e} autoCapitalize="words" />
        <Field label="GSTIN" value={f.gstin} onChangeText={set('gstin')} editable={e} autoCapitalize="characters" />
        <Field label="Address" value={f.address} onChangeText={set('address')} editable={e} multiline />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="City" value={f.city} onChangeText={set('city')} editable={e} autoCapitalize="words" /></View>
          <View style={{ flex: 1 }}><Field label="State" value={f.state} onChangeText={set('state')} editable={e} autoCapitalize="words" /></View>
        </View>
      </Card>
      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Contact</Label>
      <Card style={{ gap: Spacing.three }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Phone" value={f.phone} onChangeText={set('phone')} editable={e} keyboard="phone-pad" /></View>
          <View style={{ flex: 1 }}><Field label="WhatsApp" value={f.whatsapp} onChangeText={set('whatsapp')} editable={e} keyboard="phone-pad" /></View>
        </View>
        <Field label="Email" value={f.email} onChangeText={set('email')} editable={e} keyboard="email-address" autoCapitalize="none" />
      </Card>
      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Bank (printed on quotes and invoices)</Label>
      <Card style={{ gap: Spacing.three }}>
        <Field label="Bank name" value={f.bank_name} onChangeText={set('bank_name')} editable={e} autoCapitalize="words" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Account no." value={f.bank_account} onChangeText={set('bank_account')} editable={e} keyboard="numeric" /></View>
          <View style={{ flex: 1 }}><Field label="IFSC" value={f.bank_ifsc} onChangeText={set('bank_ifsc')} editable={e} autoCapitalize="characters" /></View>
        </View>
      </Card>
      <Label style={{ marginLeft: Spacing.one, marginTop: Spacing.two }}>Quotation</Label>
      <Card style={{ gap: Spacing.three }}>
        <Field
          label="Standard terms"
          value={f.quote_terms}
          onChangeText={set('quote_terms')}
          editable={e}
          multiline
          placeholder="Delivery, payment, validity, freight…"
        />
      </Card>
      <ErrorText>{msg}</ErrorText>
      {saved ? <Notice>Saved.</Notice> : null}
      {isOwner ? <Button label="Save" onPress={submit} busy={save.isPending} /> : null}
    </Screen>
  );
}
