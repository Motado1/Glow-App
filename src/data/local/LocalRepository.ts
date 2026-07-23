/**
 * Local, offline-first implementation of DataRepository. In-memory cache backed
 * by AsyncStorage (metadata only). A tiny event emitter implements the realtime
 * `subscribe` seam so the admin review queue updates live when a photographer
 * submits — the same shape Supabase Realtime will fill later.
 */
import type { DataRepository } from '@/data/repository';
import {
  deriveOverallFromPreInstall,
  isPreInstallProblem,
  type PreInstallStatus,
} from '@/domain/status';
import type {
  ActivityEvent,
  ActivityFilter,
  AppNotification,
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
  ProblemType,
  ReviewDecision,
  Submission,
  SubmissionFilter,
  User,
  WorkRole,
} from '@/domain/types';
import type { FarmImportRow } from '@/features/import/parseCsv';
import { nowIso } from '@/lib/date';
import { uuid } from '@/lib/id';
import { buildSeed } from './seed';
import { KEYS, readJson, writeJson } from './storage';

export class LocalRepository implements DataRepository {
  private farms: Farm[] = [];
  private photos: Photo[] = [];
  private submissions: Submission[] = [];
  private problems: Problem[] = [];
  private activity: ActivityEvent[] = [];
  private notifications: AppNotification[] = [];
  private users: User[] = [];
  private loaded = false;
  private listeners = new Map<EntityKind, Set<() => void>>();

  /* ------------------------------ lifecycle ------------------------------ */

  async init(): Promise<void> {
    if (this.loaded) return;
    const seeded = await readJson<boolean>(KEYS.seeded, false);
    if (!seeded) {
      await this.applySeed();
    } else {
      this.farms = await readJson<Farm[]>(KEYS.farms, []);
      this.photos = await readJson<Photo[]>(KEYS.photos, []);
      this.submissions = await readJson<Submission[]>(KEYS.submissions, []);
      this.problems = await readJson<Problem[]>(KEYS.problems, []);
      this.activity = await readJson<ActivityEvent[]>(KEYS.activity, []);
      this.notifications = await readJson<AppNotification[]>(KEYS.notifications, []);
      this.users = await readJson<User[]>(KEYS.users, []);
    }
    this.loaded = true;
  }

  async reset(): Promise<void> {
    await this.applySeed();
    this.loaded = true;
    (['farms', 'photos', 'submissions', 'problems', 'activity', 'notifications'] as EntityKind[]).forEach(
      (e) => this.emit(e),
    );
  }

  private async applySeed(): Promise<void> {
    const seed = buildSeed();
    this.users = seed.users;
    this.farms = seed.farms;
    this.photos = seed.photos;
    this.submissions = seed.submissions;
    this.problems = seed.problems;
    this.activity = seed.activity;
    this.notifications = seed.notifications;
    await Promise.all([
      writeJson(KEYS.users, this.users),
      writeJson(KEYS.farms, this.farms),
      writeJson(KEYS.photos, this.photos),
      writeJson(KEYS.submissions, this.submissions),
      writeJson(KEYS.problems, this.problems),
      writeJson(KEYS.activity, this.activity),
      writeJson(KEYS.notifications, this.notifications),
      writeJson(KEYS.seeded, true),
    ]);
  }

  private async ensure(): Promise<void> {
    if (!this.loaded) await this.init();
  }

  /* ------------------------------ realtime ------------------------------- */

  subscribe(entity: EntityKind, cb: () => void): () => void {
    let set = this.listeners.get(entity);
    if (!set) {
      set = new Set();
      this.listeners.set(entity, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }

  private emit(entity: EntityKind): void {
    this.listeners.get(entity)?.forEach((cb) => cb());
  }

  /* -------------------------------- users -------------------------------- */

  async listUsers(): Promise<User[]> {
    await this.ensure();
    return [...this.users];
  }

  async getUser(id: string): Promise<User | null> {
    await this.ensure();
    return this.users.find((u) => u.id === id) ?? null;
  }

  private userName(id: string): string | undefined {
    return this.users.find((u) => u.id === id)?.name;
  }

  private admins(): User[] {
    return this.users.filter((u) => u.role === 'admin' || u.role === 'reviewer');
  }

  /* -------------------------------- farms -------------------------------- */

  async listFarms(filter?: FarmFilter): Promise<Farm[]> {
    await this.ensure();
    const openProblemFarmIds = new Set(
      this.problems.filter((p) => !p.resolved).map((p) => p.farmId),
    );
    let out = this.farms.filter((f) => {
      if (filter?.state && f.state !== filter.state) return false;
      if (filter?.tripId && f.tripId !== filter.tripId) return false;
      if (filter?.photographerId && f.assignedPhotographerId !== filter.photographerId) return false;
      if (filter?.installerId && f.assignedInstallerId !== filter.installerId) return false;
      if (filter?.overallStatus && f.overallStatus !== filter.overallStatus) return false;
      if (filter?.preInstallStatus && f.preInstallStatus !== filter.preInstallStatus) return false;
      if (filter?.assignedTo &&
        f.assignedPhotographerId !== filter.assignedTo &&
        f.assignedInstallerId !== filter.assignedTo) return false;
      if (filter?.needsRetake && f.preInstallStatus !== 'retake_required') return false;
      if (filter?.hasProblem &&
        !openProblemFarmIds.has(f.id) &&
        !isPreInstallProblem(f.preInstallStatus)) return false;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const hay = `${f.name} ${f.address} ${f.glowFarmId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = out.sort((a, b) =>
      a.state === b.state
        ? a.glowFarmId.localeCompare(b.glowFarmId)
        : a.state.localeCompare(b.state),
    );
    return out;
  }

  async getFarm(id: string): Promise<Farm | null> {
    await this.ensure();
    return this.farms.find((f) => f.id === id) ?? null;
  }

  async updateFarm(id: string, patch: Partial<Farm>, byUserId?: string): Promise<Farm> {
    await this.ensure();
    const idx = this.farms.findIndex((f) => f.id === id);
    if (idx < 0) throw new Error(`Farm ${id} not found`);
    const prev = this.farms[idx];
    const next: Farm = { ...prev, ...patch, updatedAt: nowIso() };
    // Keep the overall status in sync when the pre-install status moves.
    if (patch.preInstallStatus && patch.preInstallStatus !== prev.preInstallStatus) {
      next.overallStatus = deriveOverallFromPreInstall(patch.preInstallStatus, next.overallStatus);
      await this.addActivity({
        farmId: id,
        glowFarmId: next.glowFarmId,
        kind: 'status_change',
        message: `Pre-install status → ${patch.preInstallStatus}`,
        byUserId: byUserId ?? 'system',
      });
    }
    this.farms[idx] = next;
    await writeJson(KEYS.farms, this.farms);
    this.emit('farms');
    return next;
  }

  async bulkUpsertFarms(
    rows: FarmImportRow[],
    byUserId: string,
  ): Promise<{ inserted: number; updated: number }> {
    await this.ensure();
    let inserted = 0;
    let updated = 0;
    const now = nowIso();
    for (const row of rows) {
      const existing = this.farms.find((f) => f.glowFarmId === row.glowFarmId);
      const location = row.lat !== undefined && row.lng !== undefined
        ? { lat: row.lat, lng: row.lng }
        : undefined;
      if (existing) {
        Object.assign(existing, {
          name: row.name,
          address: row.address,
          state: row.state,
          region: row.region ?? existing.region,
          hubRecordId: row.hubRecordId ?? existing.hubRecordId,
          location: location ?? existing.location,
          notes: row.notes ?? existing.notes,
          accessInstructions: row.accessInstructions ?? existing.accessInstructions,
          scheduledDate: row.scheduledDate ?? existing.scheduledDate,
          updatedAt: now,
        });
        updated++;
      } else {
        this.farms.push({
          id: uuid(),
          glowFarmId: row.glowFarmId,
          hubRecordId: row.hubRecordId,
          name: row.name,
          address: row.address,
          location,
          state: row.state,
          region: row.region,
          overallStatus: 'pre_install_needed',
          preInstallStatus: 'ready_for_assignment',
          ptoStatus: 'not_reached',
          notes: row.notes,
          accessInstructions: row.accessInstructions,
          scheduledDate: row.scheduledDate,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }
    await writeJson(KEYS.farms, this.farms);
    await this.addActivity({
      farmId: '',
      glowFarmId: '',
      kind: 'imported',
      message: `Imported ${inserted} new, updated ${updated} farms`,
      byUserId,
    });
    this.emit('farms');
    return { inserted, updated };
  }

  /* ----------------------------- assignment ------------------------------ */

  async assignFarms(
    farmIds: string[],
    userId: string,
    role: WorkRole,
    byUserId: string,
  ): Promise<void> {
    await this.ensure();
    const assignee = this.userName(userId) ?? 'worker';
    for (const fid of farmIds) {
      const farm = this.farms.find((f) => f.id === fid);
      if (!farm) continue;
      if (role === 'photographer') farm.assignedPhotographerId = userId;
      else farm.assignedInstallerId = userId;
      if (farm.preInstallStatus === 'not_ready' || farm.preInstallStatus === 'ready_for_assignment') {
        farm.preInstallStatus = 'assigned';
        farm.overallStatus = deriveOverallFromPreInstall('assigned', farm.overallStatus);
      }
      farm.updatedAt = nowIso();
      await this.addActivity({
        farmId: fid,
        glowFarmId: farm.glowFarmId,
        kind: 'assigned',
        message: `Assigned to ${assignee}`,
        byUserId,
      });
    }
    await writeJson(KEYS.farms, this.farms);
    await this.pushNotification({
      userId,
      type: 'new_assignment',
      title: 'New assignment',
      body: `${farmIds.length} farm${farmIds.length === 1 ? '' : 's'} assigned to you`,
    });
    this.emit('farms');
  }

  /* -------------------------------- photos ------------------------------- */

  async listPhotos(farmId: string, phase?: PhotoPhase): Promise<Photo[]> {
    await this.ensure();
    return this.photos.filter(
      (p) => p.farmId === farmId && (!phase || p.phase === phase),
    );
  }

  async savePhoto(input: NewPhoto): Promise<Photo> {
    await this.ensure();
    const photo: Photo = { ...input, id: uuid(), reviewState: 'pending' };
    this.photos.push(photo);
    await writeJson(KEYS.photos, this.photos);
    await this.addActivity({
      farmId: photo.farmId,
      glowFarmId: photo.glowFarmId,
      kind: 'photo_added',
      message: `Added photo: ${photo.checklistKey}`,
      byUserId: photo.capturedBy,
    });
    this.emit('photos');
    return photo;
  }

  async updatePhoto(id: string, patch: Partial<Photo>): Promise<Photo> {
    await this.ensure();
    const idx = this.photos.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`Photo ${id} not found`);
    this.photos[idx] = { ...this.photos[idx], ...patch };
    await writeJson(KEYS.photos, this.photos);
    this.emit('photos');
    return this.photos[idx];
  }

  async deletePhoto(id: string): Promise<void> {
    await this.ensure();
    this.photos = this.photos.filter((p) => p.id !== id);
    await writeJson(KEYS.photos, this.photos);
    this.emit('photos');
  }

  /* ---------------------------- submit / review -------------------------- */

  async submitForReview(farmId: string, phase: PhotoPhase, byUserId: string): Promise<Submission> {
    await this.ensure();
    const farm = this.farms.find((f) => f.id === farmId);
    if (!farm) throw new Error(`Farm ${farmId} not found`);
    const photoIds = this.photos
      .filter((p) => p.farmId === farmId && p.phase === phase && p.reviewState !== 'approved')
      .map((p) => p.id);
    // Reset the under-review set to pending.
    this.photos = this.photos.map((p) =>
      photoIds.includes(p.id) ? { ...p, reviewState: 'pending' } : p,
    );
    const submission: Submission = {
      id: uuid(),
      farmId,
      glowFarmId: farm.glowFarmId,
      phase,
      submittedBy: byUserId,
      submittedAt: nowIso(),
      status: 'submitted',
      photoIds,
    };
    this.submissions.push(submission);
    farm.preInstallStatus = 'photos_submitted';
    farm.overallStatus = deriveOverallFromPreInstall('photos_submitted', farm.overallStatus);
    farm.updatedAt = nowIso();
    await Promise.all([
      writeJson(KEYS.submissions, this.submissions),
      writeJson(KEYS.photos, this.photos),
      writeJson(KEYS.farms, this.farms),
    ]);
    await this.addActivity({
      farmId,
      glowFarmId: farm.glowFarmId,
      kind: 'submitted',
      message: `Submitted ${photoIds.length} photos for review`,
      byUserId,
    });
    for (const admin of this.admins()) {
      await this.pushNotification({
        userId: admin.id,
        type: 'photos_submitted',
        title: 'Photos submitted for review',
        body: `${farm.glowFarmId} · ${farm.name}`,
        farmId,
        glowFarmId: farm.glowFarmId,
      });
    }
    this.emit('submissions');
    this.emit('farms');
    return submission;
  }

  async listSubmissions(filter?: SubmissionFilter): Promise<Submission[]> {
    await this.ensure();
    let out = this.submissions.filter((s) => {
      if (filter?.status && s.status !== filter.status) return false;
      if (filter?.phase && s.phase !== filter.phase) return false;
      if (filter?.farmId && s.farmId !== filter.farmId) return false;
      return true;
    });
    out = out.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    return out;
  }

  async getSubmission(id: string): Promise<Submission | null> {
    await this.ensure();
    return this.submissions.find((s) => s.id === id) ?? null;
  }

  async reviewSubmission(
    id: string,
    decision: ReviewDecision,
    byUserId: string,
  ): Promise<Submission> {
    await this.ensure();
    const sub = this.submissions.find((s) => s.id === id);
    if (!sub) throw new Error(`Submission ${id} not found`);
    const farm = this.farms.find((f) => f.id === sub.farmId);
    if (!farm) throw new Error(`Farm ${sub.farmId} not found`);
    const now = nowIso();
    sub.reviewedBy = byUserId;
    sub.reviewedAt = now;

    if (decision.type === 'approve') {
      sub.status = 'approved';
      sub.reviewNote = decision.note;
      this.photos = this.photos.map((p) =>
        sub.photoIds.includes(p.id) ? { ...p, reviewState: 'approved' } : p,
      );
      farm.preInstallStatus = 'approved';
      farm.overallStatus = deriveOverallFromPreInstall('approved', farm.overallStatus);
      farm.completionDate = now;
      farm.updatedAt = now;
      await this.addActivity({
        farmId: farm.id,
        glowFarmId: farm.glowFarmId,
        kind: 'approved',
        message: 'Pre-install photos approved',
        byUserId,
      });
      await this.pushNotification({
        userId: sub.submittedBy,
        type: 'photos_approved',
        title: 'Photos approved',
        body: `${farm.glowFarmId} · ${farm.name}`,
        farmId: farm.id,
        glowFarmId: farm.glowFarmId,
      });
    } else {
      sub.status = 'retake_required';
      sub.reviewNote = decision.note;
      const targets = decision.retakePhotoIds?.length ? decision.retakePhotoIds : sub.photoIds;
      this.photos = this.photos.map((p) =>
        targets.includes(p.id)
          ? { ...p, reviewState: 'rejected', rejectionReason: decision.reason, reviewNote: decision.note }
          : p,
      );
      farm.preInstallStatus = 'retake_required';
      farm.overallStatus = deriveOverallFromPreInstall('retake_required', farm.overallStatus);
      farm.updatedAt = now;
      await this.addActivity({
        farmId: farm.id,
        glowFarmId: farm.glowFarmId,
        kind: 'retake_requested',
        message: `Retake requested (${decision.reason})${decision.note ? `: ${decision.note}` : ''}`,
        byUserId,
      });
      await this.pushNotification({
        userId: sub.submittedBy,
        type: 'retake_required',
        title: 'Retake required',
        body: `${farm.glowFarmId} · ${farm.name}`,
        farmId: farm.id,
        glowFarmId: farm.glowFarmId,
      });
    }

    await Promise.all([
      writeJson(KEYS.submissions, this.submissions),
      writeJson(KEYS.photos, this.photos),
      writeJson(KEYS.farms, this.farms),
    ]);
    this.emit('submissions');
    this.emit('photos');
    this.emit('farms');
    return sub;
  }

  /* ------------------------------- problems ------------------------------ */

  private problemToStatus(type: ProblemType): PreInstallStatus | null {
    switch (type) {
      case 'locked_gate':
      case 'property_inaccessible':
      case 'unsafe':
        return 'unable_to_access';
      case 'address_missing':
      case 'address_inaccurate':
        return 'address_problem';
      case 'no_one_home':
      case 'access_denied':
        return 'customer_contact_required';
      default:
        return null;
    }
  }

  async reportProblem(input: NewProblem): Promise<Problem> {
    await this.ensure();
    const problem: Problem = {
      ...input,
      id: uuid(),
      reportedAt: nowIso(),
      resolved: false,
    };
    this.problems.push(problem);
    await writeJson(KEYS.problems, this.problems);

    const farm = this.farms.find((f) => f.id === input.farmId);
    if (farm) {
      const mapped = this.problemToStatus(input.type);
      if (mapped) {
        farm.preInstallStatus = mapped;
        farm.overallStatus = deriveOverallFromPreInstall(mapped, farm.overallStatus);
        farm.updatedAt = nowIso();
        await writeJson(KEYS.farms, this.farms);
        this.emit('farms');
      }
      await this.addActivity({
        farmId: farm.id,
        glowFarmId: farm.glowFarmId,
        kind: 'problem_reported',
        message: `Problem reported: ${input.type}`,
        byUserId: input.reportedBy,
      });
      for (const admin of this.admins()) {
        await this.pushNotification({
          userId: admin.id,
          type: 'problem_reported',
          title: 'Problem reported',
          body: `${farm.glowFarmId} · ${input.type}`,
          farmId: farm.id,
          glowFarmId: farm.glowFarmId,
        });
      }
    }
    this.emit('problems');
    return problem;
  }

  async listProblems(filter?: ProblemFilter): Promise<Problem[]> {
    await this.ensure();
    const farmState = new Map(this.farms.map((f) => [f.id, f.state]));
    let out = this.problems.filter((p) => {
      if (filter?.farmId && p.farmId !== filter.farmId) return false;
      if (filter?.resolved !== undefined && p.resolved !== filter.resolved) return false;
      if (filter?.state && farmState.get(p.farmId) !== filter.state) return false;
      return true;
    });
    out = out.sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1));
    return out;
  }

  async resolveProblem(id: string): Promise<Problem> {
    await this.ensure();
    const p = this.problems.find((x) => x.id === id);
    if (!p) throw new Error(`Problem ${id} not found`);
    p.resolved = true;
    p.resolvedAt = nowIso();
    await writeJson(KEYS.problems, this.problems);
    this.emit('problems');
    return p;
  }

  /* ------------------------------- activity ------------------------------ */

  private async addActivity(event: NewActivityEvent): Promise<void> {
    const full: ActivityEvent = {
      ...event,
      id: uuid(),
      at: nowIso(),
      byUserName: this.userName(event.byUserId),
    };
    this.activity.push(full);
    await writeJson(KEYS.activity, this.activity);
    this.emit('activity');
  }

  async appendActivity(event: NewActivityEvent): Promise<void> {
    await this.ensure();
    await this.addActivity(event);
  }

  async listActivity(filter?: ActivityFilter): Promise<ActivityEvent[]> {
    await this.ensure();
    let out = this.activity.filter((a) => (filter?.farmId ? a.farmId === filter.farmId : true));
    out = out.sort((a, b) => (a.at < b.at ? 1 : -1));
    if (filter?.limit) out = out.slice(0, filter.limit);
    return out;
  }

  /* ----------------------------- notifications --------------------------- */

  async listNotifications(userId: string): Promise<AppNotification[]> {
    await this.ensure();
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async pushNotification(input: NewNotification): Promise<AppNotification> {
    await this.ensure();
    const n: AppNotification = { ...input, id: uuid(), read: false, createdAt: nowIso() };
    this.notifications.push(n);
    await writeJson(KEYS.notifications, this.notifications);
    this.emit('notifications');
    return n;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.ensure();
    const n = this.notifications.find((x) => x.id === id);
    if (n) {
      n.read = true;
      await writeJson(KEYS.notifications, this.notifications);
      this.emit('notifications');
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.ensure();
    this.notifications = this.notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n,
    );
    await writeJson(KEYS.notifications, this.notifications);
    this.emit('notifications');
  }
}
