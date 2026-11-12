/**
 * Style D building blocks. Every screen is made from these, so the look stays consistent.
 */
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
export function Screen({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.column}>{children}</View>
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
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'urgent';
  size?: 'large' | 'small';
}) {
  const c = useTheme();
  const bg = variant === 'urgent' ? c.attention : variant === 'secondary' ? c.primarySoft : c.primary;
  const fg = variant === 'secondary' ? c.primarySoftText : c.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={size === 'small' ? 6 : 0}
      style={({ pressed }) => [
        size === 'large' ? styles.btnLarge : styles.btnSmall,
        { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Text style={[styles.btnText, { color: fg, fontSize: size === 'large' ? 16 : 13 }]}>{label}</Text>
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
      Sample data. Live data connects in Phase 0.
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
});
