import { Tabs } from 'expo-router';
import { GlowIcon, type IconName } from '@/components/brand/GlowIcon';
import { colors, fontFamily } from '@/theme';

/** Drawn glyphs, so the tab bar is the same picture on every platform. */
function tabIcon(name: IconName) {
  return ({ focused }: { focused: boolean }) => (
    <GlowIcon name={name} size={22} color={focused ? colors.text : colors.textFaint} />
  );
}

export default function FieldLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarActiveBackgroundColor: colors.surface,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Explicit family: with a custom face loaded, fontWeight alone won't
        // resolve to the right file.
        tabBarLabelStyle: { fontFamily: fontFamily.sansMedium, fontSize: 11, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('today') }} />
      <Tabs.Screen name="farms" options={{ title: 'Farms', tabBarIcon: tabIcon('farms') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: tabIcon('alerts') }} />
      <Tabs.Screen name="farm/[farmId]" options={{ href: null }} />
      <Tabs.Screen name="install/[farmId]" options={{ href: null }} />
      <Tabs.Screen name="route" options={{ href: null }} />
      <Tabs.Screen name="problem" options={{ href: null }} />
    </Tabs>
  );
}
