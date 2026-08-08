/**
 * Core domain model for the Glow Field Operations app.
 *
 * Mirrors the requirements' "Core farm record" (§3). The Glow farm ID travels
 * with every related record (photos, submissions, problems, activity) so files
 * and documents can never attach to the wrong property.
 */

import type {
  BoxInstallStatus,
  OverallStatus,
  PreInstallStatus,
} from './status';

/* ----------------------------- Users / roles ----------------------------- */

export type Role = 'admin' | 'photographer' | 'installer' | 'reviewer';
/** Roles that can be assigned field work. */
export type WorkRole = 'photographer' | 'installer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  /** Home base / typical start city, used as a route-start hint. */
  homeBase?: string;
  active: boolean;
}

export interface Session {
  user: User;
  startedAt: string;
}

/* ------------------------------- Geography ------------------------------- */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/* --------------------------------- Farm ---------------------------------- */

export type PtoStatus = 'not_reached' | 'reached';

export interface Farm {
  /** Internal record id. */
  id: string;
  /** Glow farm ID — the identifier that follows the record everywhere. */
  glowFarmId: string;
  /** Corresponding Hub record id (source system). */
  hubRecordId?: string;

  name: string;
  address: string;
  /** Latitude/longitude. Optional — a missing value makes routing skip it. */
  location?: GeoPoint;
  state: string;
  region?: string;
  /** Lightweight trip tag (not its own entity). */
  tripId?: string;

  assignedPhotographerId?: string;
  assignedInstallerId?: string;

  // ---- Statuses (see status.ts) ----
  overallStatus: OverallStatus;
  preInstallStatus: PreInstallStatus;
  ptoStatus: PtoStatus;

  // ---- Deferred-phase fields: defined for forward-compatibility, but no
  //      screen / reducer / repository method reads or writes them this pass. ----
  boxInstallStatus?: BoxInstallStatus;
  boxSerial?: string;
  equipmentDetails?: string;
  driveFolderUrl?: string;

  scheduledDate?: string;
  /** Set when pre-install photography is approved. */
  completionDate?: string;
  notes?: string;
  accessInstructions?: string;
  /** Field-entered access limitations / obstructions (replaces a photo item). */
  obstructionNotes?: string;
  contact?: ContactInfo;

  createdAt: string;
  updatedAt: string;
}

export interface FarmFilter {
  state?: string;
  tripId?: string;
  photographerId?: string;
  installerId?: string;
  overallStatus?: OverallStatus;
  preInstallStatus?: PreInstallStatus;
  /** Free-text over name / address / glowFarmId. */
  search?: string;
  /** Only farms with an open problem or a problem status. */
  hasProblem?: boolean;
  /** Only farms needing a retake. */
  needsRetake?: boolean;
  /** Only farms assigned to this user (used by the field role). */
  assignedTo?: string;
}

/* ------------------------------- Checklist ------------------------------- */

export type PhotoPhase = 'pre_install' | 'post_install';

export interface ChecklistItem {
  id: string;
  phase: PhotoPhase;
  /** PascalCase token used in file names, e.g. "Meter". */
  key: string;
  label: string;
  required: boolean;
  description?: string;
  /** Whether a drone shot is acceptable for this item. */
  allowDrone?: boolean;
}

/* --------------------------------- Photos -------------------------------- */

export type SyncState = 'queued' | 'uploading' | 'uploaded' | 'failed';
export type ReviewState = 'pending' | 'approved' | 'rejected';
export type PhotoSource = 'camera' | 'import';

export type RejectReason =
  | 'blurry'
  | 'too_dark'
  | 'wrong_subject'
  | 'obstructed'
  | 'missing_detail'
  | 'duplicate'
  | 'wrong_farm'
  | 'other';

export const REJECT_REASON_LABEL: Record<RejectReason, string> = {
  blurry: 'Blurry / out of focus',
  too_dark: 'Too dark / underexposed',
  wrong_subject: 'Wrong subject',
  obstructed: 'Obstructed / blocked view',
  missing_detail: 'Missing required detail',
  duplicate: 'Duplicate',
  wrong_farm: 'Wrong farm',
  other: 'Other',
};

export interface Photo {
  id: string;
  farmId: string;
  glowFarmId: string;
  phase: PhotoPhase;
  checklistItemId: string;
  /** Denormalised checklist key for file naming. */
  checklistKey: string;
  fileName: string;
  /** Key into the FileStore where the binary lives. */
  localKey: string;
  /** Set once "uploaded" (a remote URL in a real backend). */
  remoteUrl?: string;
  width?: number;
  height?: number;
  source: PhotoSource;

  syncState: SyncState;
  attempts: number;
  lastError?: string;

  reviewState: ReviewState;
  rejectionReason?: RejectReason;
  reviewNote?: string;

  /** Optional photographer note on the shot. */
  note?: string;
  capturedAt: string;
  capturedBy: string;
  location?: GeoPoint;
}

/** Input to repo.savePhoto — id + review fields are assigned by the repository. */
export type NewPhoto = Omit<Photo, 'id' | 'reviewState' | 'rejectionReason' | 'reviewNote'>;

/* ------------------------------ Submissions ------------------------------ */

export type SubmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'retake_required';

export interface Submission {
  id: string;
  farmId: string;
  glowFarmId: string;
  phase: PhotoPhase;
  submittedBy: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  photoIds: string[];
}

export interface SubmissionFilter {
  status?: SubmissionStatus;
  phase?: PhotoPhase;
  farmId?: string;
}

export type ReviewDecision =
  | { type: 'approve'; note?: string }
  | {
      type: 'reject';
      reason: RejectReason;
      note?: string;
      /** Specific photos that must be retaken. */
      retakePhotoIds?: string[];
    };

/* -------------------------------- Problems ------------------------------- */

export type ProblemType =
  | 'address_missing'
  | 'address_inaccurate'
  | 'property_inaccessible'
  | 'locked_gate'
  | 'no_one_home'
  | 'access_denied'
  | 'unsafe'
  | 'weather'
  | 'drone_restriction'
  | 'solar_incomplete'
  | 'pto_not_complete'
  | 'electrical_mismatch'
  | 'no_cell_service'
  | 'box_no_connect'
  | 'missing_equipment'
  | 'return_visit'
  | 'other';

export const PROBLEM_TYPE_LABEL: Record<ProblemType, string> = {
  address_missing: 'Address does not exist',
  address_inaccurate: 'Address is inaccurate',
  property_inaccessible: 'Property inaccessible',
  locked_gate: 'Locked gate',
  no_one_home: 'No one home',
  access_denied: 'Customer denied access',
  unsafe: 'Unsafe to enter',
  weather: 'Weather prevented drone flight',
  drone_restriction: 'Drone restriction',
  solar_incomplete: 'Solar installation incomplete',
  pto_not_complete: 'PTO not actually complete',
  electrical_mismatch: 'Electrical configuration differs from records',
  no_cell_service: 'No cellular service',
  box_no_connect: 'Box will not connect',
  missing_equipment: 'Missing equipment',
  return_visit: 'Return visit required',
  other: 'Other',
};

export interface Problem {
  id: string;
  farmId: string;
  glowFarmId: string;
  type: ProblemType;
  note?: string;
  photoIds?: string[];
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export type NewProblem = Omit<Problem, 'id' | 'reportedAt' | 'resolved' | 'resolvedAt'>;

export interface ProblemFilter {
  farmId?: string;
  resolved?: boolean;
  state?: string;
}

/* ------------------------------- Activity -------------------------------- */

export type ActivityKind =
  | 'status_change'
  | 'assigned'
  | 'reassigned'
  | 'photo_added'
  | 'submitted'
  | 'approved'
  | 'retake_requested'
  | 'problem_reported'
  | 'imported'
  | 'note';

export interface ActivityEvent {
  id: string;
  farmId: string;
  glowFarmId: string;
  kind: ActivityKind;
  message: string;
  byUserId: string;
  byUserName?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export type NewActivityEvent = Omit<ActivityEvent, 'id' | 'at'>;

export interface ActivityFilter {
  farmId?: string;
  limit?: number;
}

/* ----------------------------- Notifications ----------------------------- */

export type NotificationType =
  | 'new_assignment'
  | 'assignment_changed'
  | 'photos_submitted'
  | 'photos_approved'
  | 'retake_required'
  | 'problem_reported'
  | 'farm_overdue'
  | 'upload_failed'
  | 'pto_reached'
  | 'farm_completed';

export interface AppNotification {
  id: string;
  /** Recipient user id. */
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  farmId?: string;
  glowFarmId?: string;
  read: boolean;
  createdAt: string;
}

export type NewNotification = Omit<AppNotification, 'id' | 'createdAt' | 'read'>;

/* ------------------------------ Assignments ------------------------------ */

/**
 * Assignments are derived from farms (source of truth = farm.assigned*Id),
 * grouped for the admin's per-worker dashboard view. Not a persisted entity.
 */
export interface AssignmentSummary {
  userId: string;
  userName: string;
  role: WorkRole;
  /** Every state this worker has farms in. */
  states: string[];
  farmCount: number;
  completed: number;
  remaining: number;
  overdue: number;
  awaitingReview: number;
  retakes: number;
  farmIds: string[];
  /** The grouped farms themselves, so sections don't re-scan the full list. */
  farms: Farm[];
}

/* ------------------------------ Realtime seam ---------------------------- */

export type EntityKind =
  | 'farms'
  | 'photos'
  | 'submissions'
  | 'problems'
  | 'activity'
  | 'notifications'
  | 'box_installations';

/* --------------------------- Box installation ---------------------------- */

export type ConnectivityStatus = 'pending' | 'passed' | 'failed';

export const CONNECTIVITY_LABEL: Record<ConnectivityStatus, string> = {
  pending: 'Not tested',
  passed: 'Passed',
  failed: 'Failed',
};
export type NetworkType = 'cellular' | 'ethernet' | 'wifi' | '';

export interface ConnectivityTest {
  status: ConnectivityStatus;
  testedAt?: string;
  readings?: string;
  note?: string;
}

/**
 * Monitoring-box installation record (requirements §11). One per farm. Box
 * serial + a connectivity result are the only required fields this pass; the
 * rest are optional detail (data-driven, so it can be tightened later).
 */
export interface BoxInstallation {
  id: string;
  farmId: string;
  glowFarmId: string;
  boxSerial: string;
  installerId: string;
  installedAt?: string;
  location?: GeoPoint;
  boxVersion?: string;
  powerSupply?: string;
  electricalSystemType?: string;
  voltage?: string;
  phaseConfig?: string;
  ctConfig?: string;
  ctRatio?: string;
  networkType?: NetworkType;
  simInfo?: string;
  ethernetInfo?: string;
  programmingCompleted: boolean;
  serverConnected: boolean;
  connectivityTest: ConnectivityTest;
  testReadings?: string;
  problems?: string;
  followUpRequired: boolean;
  finalApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input to saveBoxInstallation — id/timestamps are assigned by the repository. */
export type BoxInstallationInput = Omit<BoxInstallation, 'id' | 'createdAt' | 'updatedAt'>;
