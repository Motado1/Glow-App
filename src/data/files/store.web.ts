/**
 * Web FileStore — photo binaries in IndexedDB (via idb-keyval), handed back as
 * object URLs. Avoids the ~5 MB localStorage cap and gives real persistence.
 */
import { clear as idbClear, del, get, set } from 'idb-keyval';
import type { FileStore } from './FileStore';

const NS = 'glow:file:';
const urlCache = new Map<string, string>();

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

export function makeFileStore(): FileStore {
  return {
    async persist(sourceUri, key) {
      const blob = await uriToBlob(sourceUri);
      await set(NS + key, blob);
      const url = URL.createObjectURL(blob);
      urlCache.set(key, url);
      return url;
    },
    async getUri(key) {
      const cached = urlCache.get(key);
      if (cached) return cached;
      const blob = await get<Blob>(NS + key);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(key, url);
      return url;
    },
    async remove(key) {
      await del(NS + key);
      const u = urlCache.get(key);
      if (u) {
        URL.revokeObjectURL(u);
        urlCache.delete(key);
      }
    },
    async clear() {
      await idbClear();
      for (const u of urlCache.values()) URL.revokeObjectURL(u);
      urlCache.clear();
    },
  };
}
