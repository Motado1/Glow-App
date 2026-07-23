/**
 * Fallback FileStore used only by TypeScript/jest (node) resolution. Metro
 * always prefers store.native.ts / store.web.ts at runtime, so this in-memory
 * no-op never runs on a device or on web.
 */
import type { FileStore } from './FileStore';

const mem = new Map<string, string>();

export function makeFileStore(): FileStore {
  return {
    async persist(sourceUri, key) {
      mem.set(key, sourceUri);
      return sourceUri;
    },
    async getUri(key) {
      return mem.get(key) ?? null;
    },
    async remove(key) {
      mem.delete(key);
    },
    async clear() {
      mem.clear();
    },
  };
}
