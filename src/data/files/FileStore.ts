/**
 * The FileStore seam — photo BINARIES only. Split from DataRepository because a
 * real backend splits them too (rows → Postgres, bytes → Storage bucket).
 *
 * Critical correctness rule: photo bytes must NEVER go through AsyncStorage
 * (the web localStorage cap is ~5 MB). Native uses the filesystem; web uses
 * IndexedDB. Later this becomes a SupabaseStorageFileStore returning signed
 * URLs — with no change to the checklist/capture UI.
 *
 * Metro resolves the platform implementation via FileStore.native.ts /
 * FileStore.web.ts. This file is the shared type + the factory contract.
 */
export interface FileStore {
  /**
   * Copy a transient capture/import URI into durable storage under `key`
   * (the photo file name) and return a stable, displayable URI.
   */
  persist(sourceUri: string, key: string): Promise<string>;
  /** Resolve a stored key to a URI usable by <Image source={{uri}} />, or null. */
  getUri(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  /** Best-effort clear of all stored binaries (used on demo reset). */
  clear(): Promise<void>;
}

export type FileStoreFactory = () => FileStore;
