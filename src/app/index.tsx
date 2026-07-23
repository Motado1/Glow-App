import { Redirect } from 'expo-router';
import { homeRouteForRole } from '@/domain/permissions';
import { useAuthStore } from '@/stores/authStore';

/** Role router: sends the signed-in user to their home surface. */
export default function Index() {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href={homeRouteForRole(session.user.role) as never} />;
}
