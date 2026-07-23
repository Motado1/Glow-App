/**
 * Client-generated ids. Prefers the platform crypto (web + modern Hermes),
 * falling back to an RFC4122-shaped id. Dependency-free so it runs unchanged
 * in jest/node, native, and web.
 */
export function uuid(): string {
  const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Short human-facing id fragment, e.g. for display. */
export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8);
}
