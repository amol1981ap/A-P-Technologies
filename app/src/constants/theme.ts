/**
 * Control Centre design tokens: Style D (see docs/DESIGN_SYSTEM.md).
 * Green means go / fine. Terracotta means it needs attention now.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E242B',
    textSecondary: '#5B636B',
    background: '#F6F2EC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFEAE2',
    card: '#FFFFFF',
    line: '#EFEDE8',
    primary: '#1F5C46',
    onPrimary: '#FFFFFF',
    primaryText: '#1F5C46',
    primarySoft: '#E3EFE9',
    primarySoftText: '#1F5C46',
    mint: '#9CCBB8',
    track: '#F1EEE9',
    attention: '#A4532D',
    attentionText: '#8A4321',
    attentionSoft: '#F6E6DD',
    neutralSoft: '#EFEAE2',
    neutralText: '#4A4F55',
    heroSubtext: '#D5E8DF',
  },
  dark: {
    text: '#EDF1EE',
    textSecondary: '#9BA3A0',
    background: '#0F1311',
    backgroundElement: '#1A1F1D',
    backgroundSelected: '#2A302D',
    card: '#1A1F1D',
    line: '#2A302D',
    primary: '#1F5C46',
    onPrimary: '#FFFFFF',
    primaryText: '#7FD0AE',
    primarySoft: '#1D3A2F',
    primarySoftText: '#8ED8B6',
    mint: '#3C5A4E',
    track: '#232926',
    attention: '#B8603A',
    attentionText: '#F0A884',
    attentionSoft: '#3A2419',
    neutralSoft: '#2A302D',
    neutralText: '#C4CAC7',
    heroSubtext: '#CFE6DB',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Palette = { [K in ThemeColor]: string };

/** Font families loaded in the root layout (Inter for UI, Source Serif 4 for titles and big numbers). */
export const FontFamily = {
  serif: 'SourceSerif4_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

export const Fonts = Platform.select({
  default: { mono: 'monospace' },
  ios: { mono: 'ui-monospace' },
  web: { mono: 'var(--font-mono)' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  card: 22,
  tile: 14,
  pill: 999,
} as const;

/** Space to keep clear above the native tab bar. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 960;
