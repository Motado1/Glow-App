import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlowIcon, type IconName } from '@/components/brand/GlowIcon';
import { Header } from '@/components/Header';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  IconLine,
  Row,
  Screen,
  SegmentedControl,
  Spacer,
  Txt,
} from '@/components/ui';
import { repo } from '@/data';
import { ROLE_LABEL } from '@/domain/permissions';
import type { Farm, Role, User, WorkRole } from '@/domain/types';
import { summarizeAssignments } from '@/features/assignments/summarize';
import { geocodeAddress } from '@/features/geo/geocode';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

const ROLE_ICON: Record<Role, IconName> = {
  admin: 'folder',
  photographer: 'camera',
  installer: 'box',
  reviewer: 'review',
};

/** Field roles first — they're who gets added most often. */
const ROLE_ORDER: Role[] = ['photographer', 'installer', 'reviewer', 'admin'];

const ROLE_OPTIONS = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABEL[r], icon: ROLE_ICON[r] }));

interface Draft {
  name: string;
  email: string;
  role: Role;
  phone: string;
  homeBase: string;
}

const BLANK: Draft = { name: '', email: '', role: 'photographer', phone: '', homeBase: '' };

export default function People() {
  const me = useCurrentUser();
  const { data: users, refresh } = useRepoQuery(() => repo.listUsers(), ['users']);
  const { data: farms } = useRepoQuery(() => repo.listFarms(), ['farms']);

  const [editing, setEditing] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // One summary pass per work role, so each person's row can show their load
  // without every row recomputing it.
  const load = useMemo(() => {
    const out = new Map<string, { total: number; remaining: number }>();
    const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    for (const role of ['photographer', 'installer'] as WorkRole[]) {
      for (const s of summarizeAssignments((farms ?? []) as Farm[], byId, role)) {
        out.set(s.userId, { total: s.farmCount, remaining: s.remaining });
      }
    }
    return out;
  }, [farms, users]);

  const grouped = useMemo(() => {
    const list = [...(users ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    return ROLE_ORDER.map((role) => ({ role, members: list.filter((u) => u.role === role) })).filter(
      (g) => g.members.length > 0,
    );
  }, [users]);

  function openAdd() {
    setDraft(BLANK);
    setEditing(null);
    setAdding(true);
    setError(null);
  }

  function openEdit(u: User) {
    setDraft({
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone ?? '',
      homeBase: u.homeBase ?? '',
    });
    setEditing(u);
    setAdding(false);
    setError(null);
  }

  function close() {
    setAdding(false);
    setEditing(null);
    setError(null);
  }

  async function save() {
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) return setError('Enter a name.');
    // Deliberately permissive: the point is to catch a missing @, not to
    // adjudicate what a valid address looks like.
    if (!email.includes('@') || !email.includes('.')) return setError('Enter a valid email address.');

    setBusy(true);
    setError(null);
    const homeBase = draft.homeBase.trim() || undefined;

    // Resolve the home base once, here, rather than on every route calculation.
    // A failed lookup is not a failed save — the text is still worth keeping.
    let homeBaseLocation = editing?.homeBaseLocation;
    if (homeBase && homeBase !== editing?.homeBase) {
      homeBaseLocation = (await geocodeAddress(homeBase)) ?? undefined;
    } else if (!homeBase) {
      homeBaseLocation = undefined;
    }

    const patch = {
      name,
      email,
      role: draft.role,
      phone: draft.phone.trim() || undefined,
      homeBase,
      homeBaseLocation,
    };
    try {
      if (editing) await repo.updateUser(editing.id, patch);
      else await repo.createUser(patch);
      refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(u: User, active: boolean) {
    setBusy(true);
    setError(null);
    try {
      await repo.updateUser(u.id, { active });
      refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const formOpen = adding || !!editing;

  return (
    <Screen scroll>
      <Header
        eyebrow="Team"
        title="People"
        subtitle={`${(users ?? []).filter((u) => u.active).length} active`}
        onBack={() => router.back()}
        right={!formOpen ? <Button small title="Add" icon="user" onPress={openAdd} /> : undefined}
      />

      {formOpen ? (
        <Card style={{ borderWidth: 1, borderColor: colors.brand }}>
          <Txt variant="overline">{editing ? 'Edit person' : 'Add a person'}</Txt>
          <Spacer size={spacing.md} />
          <Field label="Full name" value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} autoCapitalize="words" />
          <Spacer size={spacing.md} />
          <Field
            label="Email"
            value={draft.email}
            onChangeText={(t) => setDraft((d) => ({ ...d, email: t }))}
            keyboardType="email-address"
            placeholder="name@glow.org"
          />
          <Txt variant="caption" style={{ marginTop: spacing.xs }}>
            This is how they sign in.
          </Txt>

          <Spacer size={spacing.md} />
          <Txt variant="label">Role</Txt>
          <Spacer size={spacing.xs} />
          <SegmentedControl
            options={ROLE_OPTIONS}
            value={draft.role}
            onChange={(r) => setDraft((d) => ({ ...d, role: r }))}
          />

          <Spacer size={spacing.md} />
          <Field label="Phone (optional)" value={draft.phone} onChangeText={(t) => setDraft((d) => ({ ...d, phone: t }))} />
          <Spacer size={spacing.md} />
          <Field
            label="Home base (optional)"
            value={draft.homeBase}
            onChangeText={(t) => setDraft((d) => ({ ...d, homeBase: t }))}
            placeholder="Denver, CO"
            autoCapitalize="words"
          />
          <Txt variant="caption" style={{ marginTop: spacing.xs }}>
            Their routes start from here instead of the middle of the state.
          </Txt>

          {error ? (
            <Txt color={colors.dangerText} style={{ marginTop: spacing.md }}>
              {error}
            </Txt>
          ) : null}

          <Spacer size={spacing.lg} />
          <Row gap={spacing.sm} wrap>
            <Button title={editing ? 'Save changes' : 'Add person'} icon="check" onPress={save} loading={busy} />
            <Button title="Cancel" variant="ghost" onPress={close} />
          </Row>

          {editing && editing.id !== me?.id ? (
            <>
              <Divider />
              {editing.active ? (
                <>
                  <Button
                    title="Deactivate"
                    variant="ghost"
                    icon="hold"
                    onPress={() => setActive(editing, false)}
                    loading={busy}
                    full
                  />
                  <Txt variant="caption" style={{ marginTop: spacing.xs }}>
                    They stop being able to sign in and drop off assignment lists. Their farms and photo
                    history stay exactly as they are.
                  </Txt>
                </>
              ) : (
                <Button title="Reactivate" variant="secondary" icon="check" onPress={() => setActive(editing, true)} loading={busy} full />
              )}
            </>
          ) : null}
        </Card>
      ) : null}

      {!formOpen && (users ?? []).length <= 1 ? (
        <EmptyState
          title="It's just you so far"
          subtitle="Add the photographers and installers who'll be working farms, and they'll be able to sign in with their email."
        />
      ) : null}

      {grouped.map((g) => (
        <View key={g.role} style={{ marginTop: spacing.lg }}>
          <Txt variant="overline">{ROLE_LABEL[g.role]}</Txt>
          <Spacer size={spacing.sm} />
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            {g.members.map((u) => {
              const l = load.get(u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => openEdit(u)}
                  style={({ pressed }) => [
                    {
                      paddingVertical: spacing.md,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      opacity: u.active ? 1 : 0.5,
                    },
                    pressed ? { opacity: 0.6 } : null,
                  ]}
                >
                  <Row gap={spacing.md}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: radius.sm,
                        backgroundColor: colors.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GlowIcon name={ROLE_ICON[u.role]} size={17} color={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Row gap={spacing.sm}>
                        <Txt variant="subtitle" numberOfLines={1}>
                          {u.name}
                        </Txt>
                        {u.id === me?.id ? <Badge label="You" /> : null}
                        {!u.active ? <Badge label="Inactive" tone="neutral" /> : null}
                      </Row>
                      <Txt variant="caption" numberOfLines={1}>
                        {u.email}
                      </Txt>
                      {l ? (
                        <Txt variant="caption">
                          {l.total} farm{l.total === 1 ? '' : 's'} · {l.remaining} remaining
                        </Txt>
                      ) : null}
                    </View>
                    <GlowIcon name="chevron-right" size={15} color={colors.textFaint} />
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Spacer size={spacing.xl} />
      <IconLine icon="alert">
        Everyone signs in with their email address and no password. Until the app has a server, treat
        that as a way to keep people in their own view — not as security.
      </IconLine>
    </Screen>
  );
}
