import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme';

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export default function FieldLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('☀️') }} />
      <Tabs.Screen name="farms" options={{ title: 'Farms', tabBarIcon: tabIcon('🌾') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: tabIcon('🗺️') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: tabIcon('🔔') }} />
      <Tabs.Screen name="farm/[farmId]" options={{ href: null }} />
      <Tabs.Screen name="install/[farmId]" options={{ href: null }} />
      <Tabs.Screen name="route" options={{ href: null }} />
      <Tabs.Screen name="problem" options={{ href: null }} />
    </Tabs>
  );
}
