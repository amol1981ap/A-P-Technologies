/**
 * Style D building blocks. Every screen is made from these, so the look stays consistent.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Tone = 'calm' | 'attention' | 'neutral';

/** Scrollable screen with the sand background, safe-area padding and a centred max width. */
export function Screen({ children, nested }: { children: ReactNode; nested?: boolean }) {
  const c = useTheme();
  return (
    <SafeAreaView edges={nested ? [] : ['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <View style={[styles.column, nested && { paddingTop: Spacing.two }]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Header({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: Spacing.one }}>
        {eyebrow ? <Label>{eyebrow}</Label> : null}
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

/** Small caps section label. */
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  return <Text style={[styles.label, { color: c.textSecondary }, style]}>{children}</Text>;
}

export function Body({
  children,
  muted,
  weight = 'regular',
  size = 15,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  weight?: 'regular' | 'medium' | 'semibold';
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useTheme();
  const fontFamily =
    weight === 'semibold' ? FontFamily.sansSemiBold : weight === 'medium' ? FontFamily.sansMedium : FontFamily.sans;
  return (
    <Text style={[{ fontFamily, fontSize: size, lineHeight: size * 1.4, color: muted ? c.textSecondary : c.text }, style]}>
      {children}
    </Text>
  );
}

export function BigNumber({ children, tone, style }: { children: ReactNode; tone?: Tone; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  return (
    <Text style={[styles.big, { color: tone === 'attention' ? c.attentionText : c.text }, style]}>{children}</Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.card }, style]}>{children}</View>;
}

/** A list row inside a card, separated from the previous row by a hairline. */
export function Row({ children, first }: { children: ReactNode; first?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.line }]}>
      {children}
    </View>
  );
}

export function Chip({ children, tone = 'calm' }: { children: ReactNode; tone?: Tone }) {
  const c = useTheme();
  const bg = tone === 'attention' ? c.attentionSoft : tone === 'neutral' ? c.neutralSoft : c.primarySoft;
  const fg = tone === 'attention' ? c.attentionText : tone === 'neutral' ? c.neutralText : c.primarySoftText;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled,
  busy,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'urgent';
  size?: 'large' | 'small';
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useTheme();
  const bg = variant === 'urgent' ? c.attention : variant === 'secondary' ? c.primarySoft : c.primary;
  const fg = variant === 'secondary' ? c.primarySoftText : c.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      hitSlop={size === 'small' ? 6 : 0}
      style={({ pressed }) => [
        size === 'large' ? styles.btnLarge : styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg, fontSize: size === 'large' ? 16 : 13 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Horizontal bar used for stock levels and progress. `marker` is a 0–1 reorder tick. */
export function Meter({ value, marker, tone = 'calm' }: { value: number; marker?: number; tone?: Tone }) {
  const c = useTheme();
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return (
    <View style={[styles.meter, { backgroundColor: c.track }]}>
      <View style={{ width: pct, height: '100%', borderRadius: 5, backgroundColor: tone === 'attention' ? c.attention : c.primary }} />
      {marker != null ? (
        <View style={[styles.marker, { left: `${marker * 100}%`, backgroundColor: c.text }]} />
      ) : null}
    </View>
  );
}

export function SampleNote() {
  return (
    <Body muted size={12} style={{ textAlign: 'center', marginTop: Spacing.two }}>
      Sample screen. Live data arrives in the next phases.
    </Body>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: BottomTabInset + Spacing.five, alignItems: 'center' },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingTop: Spacing.four,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three, marginBottom: Spacing.two },
  title: { fontFamily: FontFamily.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.3 },
  label: { fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' },
  big: { fontFamily: FontFamily.serif, fontSize: 30, lineHeight: 36 },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 52 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  chipText: { fontFamily: FontFamily.sansMedium, fontSize: 12 },
  btnLarge: { height: 54, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  btnSmall: { minHeight: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three },
  btnText: { fontFamily: FontFamily.sansMedium },
  meter: { flex: 1, height: 10, borderRadius: 5, justifyContent: 'center' },
  marker: { position: 'absolute', width: 2, height: 18, opacity: 0.45 },
  fieldLabel: { fontFamily: FontFamily.sansMedium, fontSize: 14 },
  hint: { fontFamily: FontFamily.sans, fontSize: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontFamily: FontFamily.sans, fontSize: 16 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill, gap: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  notice: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
});

// ───────────────────────── Forms & lists ─────────────────────────

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboard = 'default',
  multiline,
  editable = true,
  autoCapitalize = 'sentences',
  hint,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboard?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        secureTextEntry={secure}
        keyboardType={keyboard}
        multiline={multiline}
        editable={editable}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          { backgroundColor: editable ? c.background : c.neutralSoft, borderColor: c.line, color: c.text },
          multiline && { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
        ]}
      />
      {hint ? <Text style={[styles.hint, { color: c.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text> : null}
      <View accessibilityRole="radiogroup" style={[styles.segment, { backgroundColor: c.neutralSoft }]}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.segmentItem, on && { backgroundColor: c.primary }]}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: on ? FontFamily.sansMedium : FontFamily.sans, fontSize: 13, color: on ? c.onPrimary : c.text }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useTheme();
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Body>{label}</Body>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.neutralSoft, true: c.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useTheme();
  if (!children) return null;
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: c.attentionSoft }]}>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.attentionText }}>{children}</Text>
    </View>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: c.primarySoft }]}>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.primarySoftText }}>{children}</Text>
    </View>
  );
}

/** Tappable list row with a chevron. */
export function LinkRow({
  title,
  detail,
  right,
  onPress,
  first,
}: {
  title: string;
  detail?: string;
  right?: ReactNode;
  onPress?: () => void;
  first?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.line },
        pressed && { opacity: 0.6 },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="medium">{title}</Body>
        {detail ? <Body muted size={13}>{detail}</Body> : null}
      </View>
      {right}
      {onPress ? <Text style={{ color: c.textSecondary, fontSize: 20 }}>›</Text> : null}
    </Pressable>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: Spacing.five, gap: 6 }}>
      <Body weight="semibold">{title}</Body>
      {detail ? <Body muted size={13} style={{ textAlign: 'center' }}>{detail}</Body> : null}
    </Card>
  );
}

export function Loading() {
  const c = useTheme();
  return <ActivityIndicator color={c.primary} style={{ marginVertical: Spacing.five }} />;
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primaryText, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/** Wrapping pill picker for choices with many options. */
export function ChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={{
                minHeight: 40,
                paddingHorizontal: 14,
                borderRadius: Radius.pill,
                justifyContent: 'center',
                backgroundColor: on ? c.primary : c.neutralSoft,
              }}>
              <Text style={{ fontFamily: on ? FontFamily.sansMedium : FontFamily.sans, fontSize: 14, color: on ? c.onPrimary : c.text }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
