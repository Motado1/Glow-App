import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme';

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: tabIcon('📊') }} />
      <Tabs.Screen name="farms" options={{ title: 'Farms', tabBarIcon: tabIcon('🌾') }} />
      <Tabs.Screen name="assignments" options={{ title: 'Assign', tabBarIcon: tabIcon('🧭') }} />
      <Tabs.Screen name="review" options={{ title: 'Review', tabBarIcon: tabIcon('✅') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('☰') }} />
      <Tabs.Screen name="farm/[farmId]" options={{ href: null }} />
      <Tabs.Screen name="submission/[submissionId]" options={{ href: null }} />
      <Tabs.Screen name="import" options={{ href: null }} />
    </Tabs>
  );
}
