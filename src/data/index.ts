/**
 * Composition root — the ONLY place that picks concrete implementations.
 * Swapping to Supabase later means changing just these three lines (guarded by
 * an `extra.backend` flag), with no change anywhere in the UI or stores.
 */
import type { AuthRepository } from './auth/AuthRepository';
import { LocalAuth } from './auth/LocalAuth';
import type { FileStore } from './files/FileStore';
import { makeFileStore } from './files/store';
import { LocalRepository } from './local/LocalRepository';
import type { DataRepository } from './repository';

export const repo: DataRepository = new LocalRepository();
export const auth: AuthRepository = new LocalAuth();
export const files: FileStore = makeFileStore();

export type { DataRepository } from './repository';
export type { FileStore } from './files/FileStore';
export type { AuthRepository } from './auth/AuthRepository';
