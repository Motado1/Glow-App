/**
 * Date helpers. Formatting is done manually (not via Intl) so output is
 * identical across Hermes, web, and node.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parse(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso?: string): string {
  const d = parse(iso);
  if (!d) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateTime(iso?: string): string {
  const d = parse(iso);
  if (!d) return '—';
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${formatDate(iso)} · ${hh}:${mm} ${ampm}`;
}

export function relativeTime(iso?: string): string {
  const d = parse(iso);
  if (!d) return '';
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/** A scheduled farm is overdue if its date is before today and it isn't done. */
export function isOverdue(scheduledDate?: string, done?: boolean): boolean {
  const d = parse(scheduledDate);
  if (!d || done) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}
