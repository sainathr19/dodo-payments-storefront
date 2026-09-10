import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { tokens } from '../../src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Each tab names its filled and outline glyph; the filled one marks the active
// tab, which is the clearest affordance distinguishing them at this size.
const icons: Record<string, [IconName, IconName]> = {
  index: ['storefront', 'storefront-outline'],
  cart: ['cart', 'cart-outline'],
  pro: ['sparkles', 'sparkles-outline'],
  orders: ['receipt', 'receipt-outline'],
  profile: ['person-circle', 'person-circle-outline'],
};

function tabIcon(name: keyof typeof icons) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={icons[name][focused ? 0 : 1]} size={22} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.bg },
        headerTintColor: tokens.color.text,
        headerShadowVisible: false,
        headerTitleStyle: { ...tokens.text.heading, color: tokens.color.text },
        tabBarStyle: {
          backgroundColor: tokens.color.surface,
          borderTopColor: tokens.color.border,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
        },
        tabBarActiveTintColor: tokens.color.accent,
        tabBarInactiveTintColor: tokens.color.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: -0.1 },
        sceneStyle: { backgroundColor: tokens.color.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Store', tabBarIcon: tabIcon('index') }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: tabIcon('cart') }} />
      <Tabs.Screen name="pro" options={{ title: 'Pro', tabBarIcon: tabIcon('pro') }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: tabIcon('orders') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('profile') }} />
    </Tabs>
  );
}
