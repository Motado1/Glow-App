import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

/** Compact sign-out control for field screens (admins sign out from "More"). */
export function SignOutButton() {
  const signOut = useAuthStore((s) => s.signOut);
  async function onPress() {
    await signOut();
    router.replace('/');
  }
  return <Button small variant="ghost" title="Sign out" icon="⎋" onPress={onPress} />;
}
