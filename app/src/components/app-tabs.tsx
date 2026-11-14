import { NativeTabs } from 'expo-router/native-tabs';

import { TABS } from '@/constants/tabs';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function AppTabs() {
  const c = useTheme();
  const { role } = useAuth();

  return (
    <NativeTabs
      backgroundColor={c.card}
      indicatorColor={c.primarySoft}
      iconColor={{ default: c.textSecondary, selected: c.primary }}
      labelStyle={{ default: { color: c.textSecondary }, selected: { color: c.primaryText } }}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name} hidden={!role || !t.roles.includes(role)}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
