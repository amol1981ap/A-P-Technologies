import { NativeTabs } from 'expo-router/native-tabs';

import { TABS } from '@/constants/tabs';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const c = useTheme();

  return (
    <NativeTabs
      backgroundColor={c.card}
      indicatorColor={c.primarySoft}
      iconColor={{ default: c.textSecondary, selected: c.primary }}
      labelStyle={{ default: { color: c.textSecondary }, selected: { color: c.primaryText } }}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
