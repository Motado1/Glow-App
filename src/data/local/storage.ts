/**
 * Namespaced AsyncStorage helpers for METADATA only (never photo bytes).
 * Works on web (localStorage) and native. All keys are prefixed `glow:`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'glow:';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export const KEYS = {
  farms: 'farms',
  photos: 'photos',
  submissions: 'submissions',
  problems: 'problems',
  activity: 'activity',
  notifications: 'notifications',
  users: 'users',
  boxInstallations: 'box_installations',
  checkIns: 'check_ins',
  geocodeCache: 'geocode_cache',
  outbox: 'outbox',
  session: 'session',
  /**
   * Bumped to v3 when the app stopped seeding fake data. Any device still
   * holding the old demo workspace re-initialises to an empty one on next
   * launch, which is the point — otherwise 67 fabricated farms would sit
   * alongside the first real ones with no way to tell them apart.
   */
  seeded: 'initialized_v3',
} as const;
