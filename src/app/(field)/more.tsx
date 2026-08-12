import { router } from 'expo-router';
import { View } from 'react-native';
import { GlowLockup } from '@/components/brand/GlowLogo';
import { Header } from '@/components/Header';
import { MenuList } from '@/components/MenuList';
import { Button, Divider, IconLine, Row, Screen, Spacer, Txt } from '@/components/ui';
import { SyncChip } from '@/components/SyncChip';
import { ROLE_LABEL } from '@/domain/permissions';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { colors, spacing } from '@/theme';

/**
 * The field menu.
 *
 * Sign-out used to be crammed into the header of two screens, and the Route
 * screen was reachable from exactly one button on the photographer's Today page
 * — meaning an installer could never open it at all. Both have a home now.
 */
export default function FieldMore() {
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const isInstaller = user?.role === 'installer';

  async function doSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <Screen scroll>
      <Header
        eyebrow={user ? ROLE_LABEL[user.role] : undefined}
        title={user?.name ?? 'Account'}
        right={<SyncChip />}
      />

      <MenuList
        items={[
          {
            icon: 'navigate',
            label: 'Today’s route',
            detail: 'Your stops in driving order',
            href: '/(field)/route',
          },
          {
            icon: 'alert',
            label: 'Flag an issue',
            detail: 'Locked gate, wrong address, nobody home',
            href: '/(field)/problem',
          },
        ]}
      />

      <Spacer size={spacing.xl} />
      <Txt variant="overline">Your details</Txt>
      <Spacer size={spacing.sm} />
      <View style={{ gap: spacing.sm }}>
        <IconLine icon="user" variant="body" size={14} color={colors.text}>
          {user?.email ?? '—'}
        </IconLine>
        {user?.homeBase ? (
          <IconLine icon="pin" variant="body" size={14} color={colors.text}>
            Routes start from {user.homeBase}
          </IconLine>
        ) : null}
        <IconLine icon={isInstaller ? 'box' : 'camera'} variant="body" size={14} color={colors.text}>
          {user ? ROLE_LABEL[user.role] : '—'}
        </IconLine>
      </View>
      <Spacer size={spacing.sm} />
      <Txt variant="caption">Ask the office to change any of this.</Txt>

      <Divider />
      <Button title="Sign out" variant="ghost" icon="signout" onPress={doSignOut} full />

      <Spacer size={spacing.xl} />
      <Row gap={spacing.sm} justify="center" style={{ opacity: 0.5 }}>
        <GlowLockup height={14} color={colors.textFaint} />
      </Row>
    </Screen>
  );
}
