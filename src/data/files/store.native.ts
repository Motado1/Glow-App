/**
 * Native FileStore — photo binaries on the device filesystem using the SDK-54+
 * `File`/`Directory` API (the old expo-file-system API is legacy/removed). This
 * is the ONLY file that touches that API, so the SDK change is isolated here.
 */
import { Directory, File, Paths } from 'expo-file-system';
import type { FileStore } from './FileStore';

const DIR_NAME = 'glow-photos';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  try {
    if (!dir.exists) dir.create();
  } catch {
    // already exists / race — ignore
  }
  return dir;
}

function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function makeFileStore(): FileStore {
  return {
    async persist(sourceUri, key) {
      const dir = photosDir();
      const dest = new File(dir, safeKey(key));
      try {
        if (dest.exists) dest.delete();
      } catch {
        // ignore
      }
      const src = new File(sourceUri);
      await src.copy(dest);
      return dest.uri;
    },
    async getUri(key) {
      try {
        const file = new File(photosDir(), safeKey(key));
        return file.exists ? file.uri : null;
      } catch {
        return null;
      }
    },
    async remove(key) {
      try {
        const file = new File(photosDir(), safeKey(key));
        if (file.exists) file.delete();
      } catch {
        // ignore
      }
    },
    async clear() {
      try {
        const dir = photosDir();
        if (dir.exists) dir.delete();
      } catch {
        // ignore
      }
    },
  };
}
