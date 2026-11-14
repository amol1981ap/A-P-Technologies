import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { Button, Card, Empty, ErrorText, Field, LinkRow, Loading, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { PartyType } from '@/lib/database.types';
import { PARTY_TYPE_LABEL, useParties } from '@/lib/queries';

const TYPES: { value: PartyType; label: string }[] = [
  { value: 'customer', label: 'Customers' },
  { value: 'consultant', label: 'Consultants' },
  { value: 'supplier', label: 'Suppliers' },
  { value: 'transporter', label: 'Transport' },
];

export default function PartiesScreen() {
  const { role } = useAuth();
  const canEdit = role === 'owner' || role === 'sales';
  const [type, setType] = useState<PartyType>('customer');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useParties(type);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((p) => [p.name, p.contact_person, p.city, p.phone].some((v) => v?.toLowerCase().includes(term)));
  }, [data, q]);

  return (
    <Screen nested>
      <Segmented options={TYPES} value={type} onChange={setType} />
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, city or phone" autoCapitalize="none" />

      {isLoading ? <Loading /> : null}
      <ErrorText>{error?.message}</ErrorText>

      {data && shown.length === 0 ? (
        <Empty
          title={q ? 'No match' : `No ${PARTY_TYPE_LABEL[type].toLowerCase()} yet`}
          detail={canEdit && !q ? 'Add the first one below.' : undefined}
        />
      ) : null}

      {shown.length > 0 ? (
        <Card style={{ paddingVertical: Spacing.one }}>
          {shown.map((p, i) => (
            <LinkRow
              key={p.id}
              first={i === 0}
              title={p.name}
              detail={[p.contact_person, p.city, p.phone].filter(Boolean).join(' · ') || undefined}
              onPress={() => router.push({ pathname: '/more/party', params: { id: p.id } })}
            />
          ))}
        </Card>
      ) : null}

      {canEdit ? (
        <Button
          label={`Add ${PARTY_TYPE_LABEL[type].toLowerCase().replace(/s$/, '')}`}
          onPress={() => router.push({ pathname: '/more/party', params: { type } })}
        />
      ) : null}
    </Screen>
  );
}
