/**
 * The DataRepository seam — the single interface every screen and store talks
 * to. The local implementation runs the MVP; a SupabaseRepository can implement
 * the same contract later with ZERO UI changes.
 *
 * Rules that keep the swap clean:
 *  - every method is async (network latency later changes nothing),
 *  - methods return domain types, never storage rows,
 *  - callers import this interface + the composition root, never a concrete class.
 */
import type {
  ActivityEvent,
  ActivityFilter,
  AppNotification,
  BoxInstallation,
  BoxInstallationInput,
  EntityKind,
  Farm,
  FarmFilter,
  NewActivityEvent,
  NewNotification,
  NewPhoto,
  NewProblem,
  Photo,
  PhotoPhase,
  Problem,
  ProblemFilter,
  ReviewDecision,
  Submission,
  SubmissionFilter,
  User,
  WorkRole,
} from '@/domain/types';
import type { FarmImportRow } from '@/features/import/rows';

export interface DataRepository {
  // ---- Farms ----
  listFarms(filter?: FarmFilter): Promise<Farm[]>;
  getFarm(id: string): Promise<Farm | null>;
  updateFarm(id: string, patch: Partial<Farm>, byUserId?: string): Promise<Farm>;
  bulkUpsertFarms(
    rows: FarmImportRow[],
    byUserId: string,
  ): Promise<{ inserted: number; updated: number }>;

  // ---- Assignment (state / trip / individual all funnel here) ----
  assignFarms(
    farmIds: string[],
    userId: string,
    role: WorkRole,
    byUserId: string,
  ): Promise<void>;

  // ---- Photos (metadata only; bytes go through FileStore) ----
  listPhotos(farmId: string, phase?: PhotoPhase): Promise<Photo[]>;
  savePhoto(input: NewPhoto): Promise<Photo>;
  updatePhoto(id: string, patch: Partial<Photo>): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;

  // ---- Submit → review ----
  submitForReview(farmId: string, phase: PhotoPhase, byUserId: string): Promise<Submission>;
  listSubmissions(filter?: SubmissionFilter): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | null>;
  reviewSubmission(id: string, decision: ReviewDecision, byUserId: string): Promise<Submission>;

  // ---- Problems ----
  reportProblem(input: NewProblem): Promise<Problem>;
  listProblems(filter?: ProblemFilter): Promise<Problem[]>;
  resolveProblem(id: string): Promise<Problem>;

  // ---- Activity ----
  appendActivity(event: NewActivityEvent): Promise<void>;
  listActivity(filter?: ActivityFilter): Promise<ActivityEvent[]>;

  // ---- Notifications ----
  listNotifications(userId: string): Promise<AppNotification[]>;
  pushNotification(input: NewNotification): Promise<AppNotification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // ---- Box installation (post-install phase) ----
  markPtoReached(farmId: string, byUserId: string): Promise<Farm>;
  getBoxInstallation(farmId: string): Promise<BoxInstallation | null>;
  listBoxInstallations(): Promise<BoxInstallation[]>;
  saveBoxInstallation(input: BoxInstallationInput, byUserId: string): Promise<BoxInstallation>;

  // ---- Users ----
  listUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | null>;

  // ---- Realtime seam (local: in-memory emitter; supabase: channel) ----
  subscribe(entity: EntityKind, cb: () => void): () => void;

  // ---- Lifecycle ----
  /** Ensure seed data exists (idempotent). */
  init(): Promise<void>;
  /** Wipe + reseed (demo reset). */
  reset(): Promise<void>;
}
