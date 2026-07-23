/**
 * Auth store. Hydrates the persisted session on launch (the hydration flag
 * gates the root layout so we never flash the login screen or navigate before
 * the router mounts).
 */
import { create } from 'zustand';
import { auth, repo } from '@/data';
import type { Role, Session, User } from '@/domain/types';

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  async hydrate() {
    await repo.init();
    const session = await auth.getSession();
    set({ session, hydrated: true });
  },
  async signIn(email, password) {
    const session = await auth.signIn(email, password);
    set({ session });
  },
  async signOut() {
    await auth.signOut();
    set({ session: null });
  },
}));

/** Convenience selectors. */
export function useCurrentUser(): User | null {
  return useAuthStore((s) => s.session?.user ?? null);
}

export function useCurrentRole(): Role | null {
  return useAuthStore((s) => s.session?.user.role ?? null);
}
