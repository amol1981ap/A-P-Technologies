import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function MoreLayout() {
  const c = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.primaryText,
        headerTitleStyle: { fontFamily: FontFamily.sansSemiBold, color: c.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="products" options={{ title: 'Products & rates' }} />
      <Stack.Screen name="parties" options={{ title: 'Parties' }} />
      <Stack.Screen name="party" options={{ title: 'Party' }} />
      <Stack.Screen name="team" options={{ title: 'Team' }} />
      <Stack.Screen name="company" options={{ title: 'Company details' }} />
      <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Stack.Screen name="password" options={{ title: 'Change password' }} />
      <Stack.Screen name="task" options={{ title: 'Task' }} />
    </Stack>
  );
}
