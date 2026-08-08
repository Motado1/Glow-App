import { Tabs } from 'expo-router';
import { GlowIcon, type IconName } from '@/components/brand/GlowIcon';
import { colors, fontFamily } from '@/theme';

/** Drawn glyphs, so the tab bar is the same picture on every platform. */
function tabIcon(name: IconName) {
  return ({ focused }: { focused: boolean }) => (
    <GlowIcon name={name} size={22} color={focused ? colors.text : colors.textFaint} />
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Orange is the brand's UI accent — used here for the active state.
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarActiveBackgroundColor: colors.surface,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Explicit family: with a custom face loaded, fontWeight alone won't
        // resolve to the right file.
        tabBarLabelStyle: { fontFamily: fontFamily.sansMedium, fontSize: 11, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: tabIcon('dashboard') }} />
      <Tabs.Screen name="farms" options={{ title: 'Farms', tabBarIcon: tabIcon('farms') }} />
      <Tabs.Screen name="assignments" options={{ title: 'Assign', tabBarIcon: tabIcon('assign') }} />
      <Tabs.Screen name="review" options={{ title: 'Review', tabBarIcon: tabIcon('review') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('more') }} />
      <Tabs.Screen name="farm/[farmId]" options={{ href: null }} />
      <Tabs.Screen name="submission/[submissionId]" options={{ href: null }} />
      <Tabs.Screen name="import" options={{ href: null }} />
    </Tabs>
  );
}
