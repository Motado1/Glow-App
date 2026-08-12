/**
 * Local sign-in. Matches an email against the **persisted** user list — the
 * same rows Admin -> People writes — so somebody added today can sign in today.
 *
 * It used to match against a hardcoded seed array, which meant a newly added
 * photographer silently could not get in.
 *
 * There is still no password. That is not a gap this layer can close: with all
 * data on the device, any check here is one a determined person walks around.
 * Real credentials arrive with the server, and this is the seam they land in.
 */
import { KEYS, readJson, removeKey, writeJson } from '@/data/local/storage';
import { buildEmptyWorkspace } from '@/data/local/seed';
import type { Session, User } from '@/domain/types';
import { nowIso } from '@/lib/date';
import type { AuthRepository } from './AuthRepository';

async function roster(): Promise<User[]> {
  const users = await readJson<User[]>(KEYS.users, []);
  // A device that has never opened the app has no stored roster yet; fall back
  // to the founding admin so the very first sign-in can succeed.
  return users.length ? users : buildEmptyWorkspace().users;
}

export class LocalAuth implements AuthRepository {
  async signIn(email: string, _password?: string): Promise<Session> {
    const wanted = email.trim().toLowerCase();
    if (!wanted) throw new Error('Enter your email address.');
    const user = (await roster()).find((u) => u.email.trim().toLowerCase() === wanted);
    if (!user) throw new Error('No account found for that email address.');
    if (!user.active) throw new Error('That account has been deactivated.');
    const session: Session = { user, startedAt: nowIso() };
    await writeJson(KEYS.session, session);
    return session;
  }

  async signOut(): Promise<void> {
    await removeKey(KEYS.session);
  }

  async getSession(): Promise<Session | null> {
    return readJson<Session | null>(KEYS.session, null);
  }

  async listDemoUsers(): Promise<User[]> {
    return (await roster()).filter((u) => u.active);
  }
}
