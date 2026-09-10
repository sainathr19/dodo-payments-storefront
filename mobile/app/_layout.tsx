import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../src/state/session';
import { tokens } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tokens.color.bg },
          headerTintColor: tokens.color.text,
          headerShadowVisible: false,
          headerTitleStyle: { ...tokens.text.heading, color: tokens.color.text },
          contentStyle: { backgroundColor: tokens.color.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}
