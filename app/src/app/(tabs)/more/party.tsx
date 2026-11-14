import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, Card, ErrorText, Field, Loading, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { Party, PartyType } from '@/lib/database.types';
import { blankToNull, GSTIN_PATTERN, useParty, useSaveParty } from '@/lib/queries';

const TYPES: { value: PartyType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'transporter', label: 'Transport' },
];

type Form = Record<'name' | 'contact_person' | 'phone' | 'whatsapp' | 'email' | 'gstin' | 'address' | 'city' | 'state' | 'notes', string>;
const EMPTY: Form = { name: '', contact_person: '', phone: '', whatsapp: '', email: '', gstin: '', address: '', city: '', state: '', notes: '' };

function toForm(p: Party): Form {
  return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, (p[k as keyof Party] as string | null) ?? ''])) as Form;
}

export default function PartyScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: PartyType }>();
  const { data: existing, isLoading } = useParty(params.id);
  if (params.id && (isLoading || !existing)) return <Loading />;
  return <PartyForm key={existing?.id ?? 'new'} existing={existing ?? null} initialType={params.type ?? 'customer'} />;
}

function PartyForm({ existing, initialType }: { existing: Party | null; initialType: PartyType }) {
  const { role } = useAuth();
  const canEdit = role === 'owner' || role === 'sales';
  const save = useSaveParty();
  const [type, setType] = useState<PartyType>(existing?.type ?? initialType);
  const [f, setF] = useState<Form>(existing ? toForm(existing) : EMPTY);
  const [msg, setMsg] = useState('');

  const set = (k: keyof Form) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  async function submit() {
    setMsg('');
    if (!f.name.trim()) return setMsg('Enter a name.');
    const gstin = f.gstin.trim().toUpperCase();
    if (gstin && !GSTIN_PATTERN.test(gstin)) return setMsg('GSTIN should be 15 characters, like 27ABCDE1234F1Z5.');
    try {
      await save.mutateAsync({
        id: existing?.id,
        type,
        name: f.name.trim(),
        contact_person: blankToNull(f.contact_person),
        phone: blankToNull(f.phone),
        whatsapp: blankToNull(f.whatsapp),
        email: blankToNull(f.email),
        gstin: gstin || null,
        address: blankToNull(f.address),
        city: blankToNull(f.city),
        state: blankToNull(f.state),
        notes: blankToNull(f.notes),
      });
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const wa = (f.whatsapp || f.phone).replace(/\D/g, '');

  return (
    <Screen nested>
      <Stack.Screen options={{ title: existing ? f.name || 'Party' : 'New party' }} />
      <Segmented options={TYPES} value={type} onChange={canEdit ? setType : () => {}} />
      <Card style={{ gap: Spacing.three }}>
        <Field label="Name" value={f.name} onChangeText={set('name')} editable={canEdit} autoCapitalize="words" />
        <Field label="Contact person" value={f.contact_person} onChangeText={set('contact_person')} editable={canEdit} autoCapitalize="words" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboard="phone-pad" editable={canEdit} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="WhatsApp" value={f.whatsapp} onChangeText={set('whatsapp')} keyboard="phone-pad" editable={canEdit} placeholder="Same as phone" />
          </View>
        </View>
        <Field label="Email" value={f.email} onChangeText={set('email')} keyboard="email-address" autoCapitalize="none" editable={canEdit} />
        <Field label="GSTIN" value={f.gstin} onChangeText={set('gstin')} autoCapitalize="characters" editable={canEdit} />
        <Field label="Address" value={f.address} onChangeText={set('address')} multiline editable={canEdit} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="City" value={f.city} onChangeText={set('city')} autoCapitalize="words" editable={canEdit} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="State" value={f.state} onChangeText={set('state')} autoCapitalize="words" editable={canEdit} />
          </View>
        </View>
        <Field label="Notes" value={f.notes} onChangeText={set('notes')} multiline editable={canEdit} />
      </Card>
      <ErrorText>{msg}</ErrorText>
      {canEdit ? <Button label="Save" onPress={submit} busy={save.isPending} /> : null}
      {existing && wa.length >= 10 ? (
        <Button
          label="Message on WhatsApp"
          variant="secondary"
          onPress={() => Linking.openURL(`https://wa.me/${wa.length === 10 ? `91${wa}` : wa}`)}
        />
      ) : null}
    </Screen>
  );
}
