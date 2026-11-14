import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Platform, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Field, Label, Loading, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatNum, waNumber } from '@/lib/calc';
import { DESPATCH_LABEL, uploadProof, useDespatch, useProofUrl, useUpdateDespatch, type DespatchBundle } from '@/lib/ops-queries';
import { productName } from '@/lib/queries';

export default function DespatchScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, error } = useDespatch(id);
  if (error) return <ErrorText>{error.message}</ErrorText>;
  if (!data) return <Loading />;
  return <Slip key={`${data.despatch.id}-${data.despatch.updated_at}`} bundle={data} />;
}

function Slip({ bundle: b }: { bundle: DespatchBundle }) {
  const { isOwner, profile } = useAuth();
  const d = b.despatch;
  const mine = isOwner || d.assigned_to === profile?.id;
  const update = useUpdateDespatch();
  const proof = useProofUrl(d.proof_path);
  const [vehicle, setVehicle] = useState(d.vehicle_no ?? '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const done = d.status === 'delivered';
  const address = b.order?.site_address ?? '';
  const phone = waNumber(b.party?.phone);
  const vehicleOk = vehicle.trim().length >= 4;

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

  async function takePhoto() {
    setMsg('');
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setMsg('Allow camera access in your phone settings to take the photo.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
    const res = Platform.OS === 'web' ? await ImagePicker.launchImageLibraryAsync(opts) : await ImagePicker.launchCameraAsync(opts);
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  }

  const markLoaded = () =>
    guarded(async () => {
      if (!vehicleOk) throw new Error('Enter the vehicle number.');
      await update.mutateAsync({ id: d.id, status: 'loaded', vehicle_no: vehicle.trim().toUpperCase() });
    });

  const markDelivered = () =>
    guarded(async () => {
      if (!vehicleOk) throw new Error('Enter the vehicle number.');
      if (!photo && !d.proof_path) throw new Error('Take a photo of the signed challan first.');
      const path = photo ? await uploadProof(d.id, photo) : d.proof_path!;
      await update.mutateAsync({ id: d.id, status: 'delivered', vehicle_no: vehicle.trim().toUpperCase(), proof_path: path, delivered_at: new Date().toISOString() });
      router.back();
    });

  return (
    <Screen nested>
      <Stack.Screen options={{ title: d.number }} />

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" size={18}>{b.party?.name ?? 'Customer'}</Body>
            <Body muted size={13}>{b.order?.number}{b.order?.po_number ? ` · PO ${b.order.po_number}` : ''}</Body>
          </View>
          <Chip tone={done ? 'calm' : d.status === 'loaded' ? 'neutral' : 'attention'}>{DESPATCH_LABEL[d.status]}</Chip>
        </View>
        {address ? <Body>{address}</Body> : <Body muted>No site address on the order.</Body>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {b.party?.phone ? (
            <View style={{ flex: 1 }}>
              <Button label="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${b.party!.phone}`)} />
            </View>
          ) : null}
          {phone ? (
            <View style={{ flex: 1 }}>
              <Button label="WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${phone}`)} />
            </View>
          ) : null}
          {address ? (
            <View style={{ flex: 1 }}>
              <Button label="Map" variant="secondary" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)} />
            </View>
          ) : null}
        </View>
      </Card>

      <Label style={{ marginLeft: Spacing.one }}>Load</Label>
      <Card style={{ gap: 12 }}>
        {b.items.map((i) => {
          const p = b.products.find((x) => x.id === i.product_id);
          return (
            <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="medium">{p ? productName(p) : 'Product'}</Body>
                {i.batch_no ? <Body muted size={12}>Batch {i.batch_no}</Body> : null}
              </View>
              <Body weight="semibold">{formatNum(i.metres, 2)} m</Body>
            </View>
          );
        })}
      </Card>

      {mine && !done ? (
        <>
          <Card style={{ gap: Spacing.three }}>
            <Field label="Vehicle number" value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="MH 08 AB 4521" />
            {photo ? <Image source={{ uri: photo }} accessibilityLabel="Challan photo" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} /> : null}
            <Button label={photo ? 'Retake photo' : 'Photo of signed challan'} variant="secondary" onPress={takePhoto} />
          </Card>
          <ErrorText>{msg}</ErrorText>
          {d.status === 'pending' ? <Button label="Mark loaded" variant="secondary" onPress={markLoaded} busy={busy} /> : null}
          <Button label="Mark delivered" onPress={markDelivered} busy={busy} />
        </>
      ) : null}

      {done ? (
        <>
          <Notice>
            Delivered{d.delivered_at ? ` on ${new Date(d.delivered_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}
            {d.vehicle_no ? ` · ${d.vehicle_no}` : ''}.
          </Notice>
          {proof.data ? (
            <Card style={{ gap: 8 }}>
              <Body weight="medium">Signed challan</Body>
              <Image source={{ uri: proof.data }} accessibilityLabel="Signed challan photo" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} />
            </Card>
          ) : null}
        </>
      ) : null}
      {!mine ? <Notice>This despatch is assigned to someone else.</Notice> : null}
    </Screen>
  );
}
