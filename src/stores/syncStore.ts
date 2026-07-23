/**
 * Offline sync store (requirements §12). Photos are written optimistically and
 * an idempotent task is queued; this store drains the outbox whenever we're
 * "online". Since there's no real server yet, `performTask` just flips the
 * photo's syncState after a short delay — the ONE place a real uploader slots
 * in. Connectivity is device state (NetInfo) AND a dev override toggle.
 */
import { create } from 'zustand';
import { repo } from '@/data';
import { KEYS, readJson, writeJson } from '@/data/local/storage';
import {
  failedCount,
  isPermanentlyFailed,
  makeTask,
  markDone,
  markError,
  markInProgress,
  nextRunnableTask,
  pendingCount,
  pruneDone,
  retryableErrorCount,
  type SyncTask,
} from '@/features/sync/outbox';
import { nowIso } from '@/lib/date';
import { uuid } from '@/lib/id';

interface SyncState {
  deviceOnline: boolean;
  manualOffline: boolean;
  tasks: SyncTask[];
  draining: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDeviceOnline: (v: boolean) => void;
  toggleManualOffline: () => void;
  isOnline: () => boolean;
  enqueuePhotoUpload: (photoId: string) => Promise<void>;
  drain: () => Promise<void>;
  pending: () => number;
  failed: () => number;
}

async function persistTasks(tasks: SyncTask[]): Promise<void> {
  await writeJson(KEYS.outbox, tasks);
}

async function performTask(task: SyncTask): Promise<void> {
  if (task.type === 'photo-upload') {
    await repo.updatePhoto(task.refId, { syncState: 'uploading' });
    // Simulated network upload. A real backend uploads bytes to storage here.
    await new Promise((resolve) => setTimeout(resolve, 500));
    await repo.updatePhoto(task.refId, {
      syncState: 'uploaded',
      remoteUrl: `local://${task.refId}`,
    });
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  deviceOnline: true,
  manualOffline: false,
  tasks: [],
  draining: false,
  hydrated: false,

  async hydrate() {
    const tasks = await readJson<SyncTask[]>(KEYS.outbox, []);
    set({ tasks, hydrated: true });
    void get().drain();
  },

  setDeviceOnline(v) {
    set({ deviceOnline: v });
    if (get().isOnline()) void get().drain();
  },

  toggleManualOffline() {
    set({ manualOffline: !get().manualOffline });
    if (get().isOnline()) void get().drain();
  },

  isOnline() {
    const s = get();
    return s.deviceOnline && !s.manualOffline;
  },

  async enqueuePhotoUpload(photoId) {
    const task = makeTask({ id: uuid(), type: 'photo-upload', refId: photoId, nowIso: nowIso() });
    const tasks = [...get().tasks, task];
    set({ tasks });
    await persistTasks(tasks);
    if (get().isOnline()) void get().drain();
  },

  async drain() {
    if (get().draining || !get().isOnline()) return;
    set({ draining: true });
    try {
      for (;;) {
        if (!get().isOnline()) break;
        const task = nextRunnableTask(get().tasks, Date.now());
        if (!task) break;
        set({ tasks: get().tasks.map((t) => (t.id === task.id ? markInProgress(t, nowIso()) : t)) });
        try {
          await performTask(task);
          const done = pruneDone(
            get().tasks.map((t) => (t.id === task.id ? markDone(t, nowIso()) : t)),
          );
          set({ tasks: done });
          await persistTasks(done);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Upload failed';
          const errored = get().tasks.map((t) =>
            t.id === task.id ? markError(t, msg, nowIso(), Date.now()) : t,
          );
          set({ tasks: errored });
          await persistTasks(errored);
          const updated = errored.find((t) => t.id === task.id);
          if (updated && isPermanentlyFailed(updated)) {
            await repo.updatePhoto(task.refId, { syncState: 'failed', lastError: msg });
          }
        }
      }
    } finally {
      set({ draining: false });
      // Re-attempt backed-off tasks a little later.
      if (retryableErrorCount(get().tasks) > 0) {
        setTimeout(() => void get().drain(), 3000);
      }
    }
  },

  pending() {
    return pendingCount(get().tasks);
  },
  failed() {
    return failedCount(get().tasks);
  },
}));
