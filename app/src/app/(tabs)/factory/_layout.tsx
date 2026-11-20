import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function FactoryLayout() {
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
      <Stack.Screen name="production" options={{ title: 'Today’s production' }} />
      <Stack.Screen name="receive" options={{ title: 'Receive material' }} />
      <Stack.Screen name="purchases" options={{ title: 'Purchase orders' }} />
      <Stack.Screen name="po" options={{ title: 'Purchase order' }} />
      <Stack.Screen name="tests" options={{ title: 'Batch tests' }} />
    </Stack>
  );
}
