import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { tabsFor } from '@/constants/tabs';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function AppTabs() {
  const { role } = useAuth();
  return (
    <Tabs>
      <TabList asChild>
        <CustomTabList>
          {tabsFor(role).map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton>{t.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const c = useTheme();
  const narrow = useWindowDimensions().width < 640;
  // The slot's ref is typed for a View; Pressable doesn't need it here.
  const { ref: _ref, ...pressableProps } = props;
  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        styles.tabButton,
        narrow && styles.tabButtonNarrow,
        { backgroundColor: isFocused ? c.primary : 'transparent' },
        pressed && styles.pressed,
      ]}>
      <Text
        style={{
          fontFamily: isFocused ? FontFamily.sansMedium : FontFamily.sans,
          fontSize: narrow ? 13 : 14,
          color: isFocused ? c.onPrimary : c.text,
        }}>
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const c = useTheme();
  const narrow = useWindowDimensions().width < 640;
  return (
    <View {...props} style={[styles.bar, { backgroundColor: c.card, borderBottomColor: c.line }]}>
      <View style={styles.inner}>
        <Text style={[styles.brand, { color: c.text }, narrow && styles.brandNarrow]}>Control Centre</Text>
        <View style={[styles.tabs, narrow && styles.tabsNarrow]}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brand: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    marginRight: 'auto',
  },
  brandNarrow: { width: '100%' },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tabsNarrow: { width: '100%', flexWrap: 'nowrap', justifyContent: 'space-between', gap: 0 },
  tabButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  tabButtonNarrow: { paddingHorizontal: 8 },
  pressed: { opacity: 0.7 },
});
