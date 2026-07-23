/**
 * The AuthRepository seam. LocalAuth (demo users, no real password) now;
 * SupabaseAuth later. `getSession` is the single source of truth the app
 * hydrates from on launch.
 */
import type { Session, User } from '@/domain/types';

export interface AuthRepository {
  /** Sign in by email. Password is accepted but ignored in the local demo. */
  signIn(email: string, password?: string): Promise<Session>;
  signOut(): Promise<void>;
  /** Restore a persisted session on launch (null when signed out). */
  getSession(): Promise<Session | null>;
  /** Demo-only: the seeded users offered on the login screen. */
  listDemoUsers(): Promise<User[]>;
}
