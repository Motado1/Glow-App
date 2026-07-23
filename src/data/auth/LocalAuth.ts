/**
 * Local demo auth. Sign-in matches a seeded user by email (password ignored).
 * The session persists in AsyncStorage and is the hydration source of truth.
 */
import { KEYS, readJson, removeKey, writeJson } from '@/data/local/storage';
import { SEED_USERS } from '@/data/local/seed';
import type { Session, User } from '@/domain/types';
import { nowIso } from '@/lib/date';
import type { AuthRepository } from './AuthRepository';

export class LocalAuth implements AuthRepository {
  async signIn(email: string, _password?: string): Promise<Session> {
    const user = SEED_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!user) throw new Error('No account found for that email.');
    if (!user.active) throw new Error('That account is inactive.');
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
    return SEED_USERS.filter((u) => u.active);
  }
}
