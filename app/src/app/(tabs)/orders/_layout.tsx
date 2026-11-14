import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function OrdersLayout() {
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
      <Stack.Screen name="order" options={{ title: 'Order' }} />
      <Stack.Screen name="despatch" options={{ title: 'Despatch' }} />
    </Stack>
  );
}
