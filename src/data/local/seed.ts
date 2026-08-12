/**
 * What a fresh install starts with: one administrator, and nothing else.
 *
 * The app used to generate 67 farms, 33 photos, 21 notifications and a full
 * review queue on first launch. That made it a convincing demo and a useless
 * tool — there was no way to tell real records from fabricated ones. Sample
 * data now lives in `sampleData.ts` and is loaded only on request.
 *
 * One account survives because somebody has to be able to sign in on a device
 * that has never been used. Everyone else is added from Admin -> People.
 */
import type {
  ActivityEvent,
  AppNotification,
  BoxInstallation,
  Farm,
  Photo,
  Problem,
  Submission,
  User,
} from '@/domain/types';

export interface WorkspaceData {
  users: User[];
  farms: Farm[];
  photos: Photo[];
  submissions: Submission[];
  problems: Problem[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  boxInstallations: BoxInstallation[];
}

/**
 * The one account that exists before anyone has set anything up.
 *
 * Its email is the sign-in key, so changing it strands the only way into a
 * fresh install.
 */
export const FOUNDING_ADMIN: User = {
  id: 'u-jared',
  name: 'Jared Morgan',
  email: 'jared@glow.org',
  role: 'admin',
  active: true,
};

/** A workspace with an administrator and no work in it yet. */
export function buildEmptyWorkspace(): WorkspaceData {
  return {
    users: [FOUNDING_ADMIN],
    farms: [],
    photos: [],
    submissions: [],
    problems: [],
    activity: [],
    notifications: [],
    boxInstallations: [],
  };
}
