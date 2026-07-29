import { create } from 'zustand';
import type { StartMode } from '@/features/routing/startPoint';

interface RouteStartState {
  mode: StartMode;
  setMode: (m: StartMode) => void;
  reset: () => void;
}

/** Session-scoped so Today and Route agree on the starting point. */
export const useRouteStartStore = create<RouteStartState>((set) => ({
  mode: { kind: 'auto' },
  setMode: (mode) => set({ mode }),
  reset: () => set({ mode: { kind: 'auto' } }),
}));
