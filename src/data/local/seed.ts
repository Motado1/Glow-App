/**
 * Demo seed data. Deterministic (seeded PRNG) so the dataset is stable across
 * reloads until an explicit reset. ~55 farms across two states with a realistic
 * spread of statuses, a few field problems, and a pre-populated review queue.
 */
import {
  deriveOverallFromBoxInstall,
  deriveOverallFromPreInstall,
  type BoxInstallStatus,
  type PreInstallStatus,
} from '@/domain/status';
import type {
  ActivityEvent,
  AppNotification,
  BoxInstallation,
  ConnectivityStatus,
  Farm,
  Photo,
  Problem,
  Submission,
  User,
} from '@/domain/types';
import { DEFAULT_POST_INSTALL_CHECKLIST, DEFAULT_PRE_INSTALL_CHECKLIST } from '@/features/photos/checklist';
import { buildPhotoFileName } from '@/features/photos/fileName';

export interface SeedData {
  users: User[];
  farms: Farm[];
  photos: Photo[];
  submissions: Submission[];
  problems: Problem[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  boxInstallations: BoxInstallation[];
}

export const SEED_USERS: User[] = [
  { id: 'u-jared', name: 'Jared Morgan', email: 'jared@glow.org', role: 'admin', active: true },
  { id: 'u-dan', name: 'Dan Whitfield', email: 'dan@glow.org', role: 'photographer', phone: '+1 720 555 0142', homeBase: 'Denver, CO', active: true },
  { id: 'u-maria', name: 'Maria Ortiz', email: 'maria@glow.org', role: 'photographer', phone: '+1 316 555 0188', homeBase: 'Wichita, KS', active: true },
  { id: 'u-sam', name: 'Sam Reeves', email: 'sam@glow.org', role: 'installer', phone: '+1 720 555 0170', homeBase: 'Denver, CO', active: true },
  { id: 'u-priya', name: 'Priya Nair', email: 'priya@glow.org', role: 'reviewer', active: true },
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StateCfg {
  code: string;
  name: string;
  center: { lat: number; lng: number };
  spread: number;
  cities: string[];
  count: number;
  photographerId: string;
}

const STATES: StateCfg[] = [
  {
    code: 'CO',
    name: 'Colorado',
    center: { lat: 39.9, lng: -104.9 },
    spread: 1.3,
    cities: ['Denver', 'Aurora', 'Boulder', 'Longmont', 'Greeley', 'Fort Collins', 'Loveland', 'Castle Rock', 'Parker', 'Brighton', 'Windsor', 'Berthoud'],
    count: 43,
    photographerId: 'u-dan',
  },
  {
    code: 'KS',
    name: 'Kansas',
    center: { lat: 37.7, lng: -97.3 },
    spread: 1.1,
    cities: ['Wichita', 'Hutchinson', 'Newton', 'Derby', 'Andover', 'El Dorado', 'Augusta', 'Haysville'],
    count: 12,
    photographerId: 'u-maria',
  },
];

const STREETS = ['County Rd 14', 'Prairie View Rd', 'Ranch House Ln', 'Sunflower Ave', 'Meadowlark Dr', 'Old Mill Rd', 'Harvest Way', 'Cottonwood Ln', 'Ridgeline Rd', 'Homestead Dr'];

/**
 * Farm names are drawn from a fixed list rather than combined from adjective x
 * noun pools: 10 x 8 combinations across 55 farms produced duplicate names and
 * phrases no one would use ("Acres Farm"). Each row here is used once.
 */
const FARM_NAMES = [
  'Circle K Ranch', 'Twin Buttes', 'Halvorsen Dairy', 'Clearwater Orchards', 'Boot Hill Cattle Co.',
  'Sandhill Grain', 'Rocky Fork Ranch', 'Elkhorn Acres', 'Sunrise Dairy', 'Prairie Rose Farms',
  'McAllister Feedlot', 'Bitter Creek Ranch', 'Larkspur Hollow', 'Nine Mile Farm', 'Wheatland Co-op',
  'Kessler Brothers', 'Antelope Flats', 'Old Baldy Ranch', 'Cottonwood Bend', 'Redtail Farms',
  'Vasquez Family Farm', 'Bear Creek Cattle', 'Solstice Orchards', 'Hollenbeck Grain', 'Dry Gulch Ranch',
  'Meadowlark Dairy', 'Two Rivers Farm', 'Ostrander Acres', 'Painted Sky Ranch', 'Fairview Hereford',
  'Quandary Farms', 'Whitlock & Sons', 'Bluestem Prairie', 'Iron Springs Ranch', 'Delaney Homestead',
  'Cimarron Cattle Co.', 'Northgate Grain', 'Aspen Grove Farm', 'Hartman Feed & Seed', 'Silver Plume Ranch',
  'Buffalo Wallow Farm', 'Osage Ridge', 'Kettleman Dairy', 'Wagon Wheel Ranch', 'Little Blue Farms',
  'Renfro Cattle Co.', 'Chalk Bluff Ranch', 'Sagebrush Acres', 'Duffy Grain', 'Mesa Verde Orchards',
  'Turkey Creek Farm', 'Lindquist Dairy', 'Wind River Ranch', 'Copper Basin Farms', 'Foxglove Hollow',
  'Standing Rock Ranch', 'Bergstrom Grain', 'High Lonesome Farm', 'Ashcroft Acres', 'Marisol Vineyards',
];

/** Owner names, so a contact card doesn't read "Denver Owner". */
const CONTACT_NAMES = [
  'Ray Hollenbeck', 'Dana Whitmore', 'Luis Vasquez', 'Peg Ostrander', 'Curtis Duffy',
  'Marlene Kessler', 'Tom Renfro', 'Alice Standing Bear', 'Gus Halvorsen', 'Bev Lindquist',
  'Wes McAllister', 'Nadia Ashcroft', 'Frank Delaney', 'Rosa Marisol', 'Hank Bergstrom',
];

/**
 * Access notes vary per farm — every record carrying the same gate code was
 * the tell that made the whole dataset read as generated.
 */
const ACCESS_NOTES = [
  'Gate code 4412. Dog on the property — call ahead.',
  'Second driveway past the grain bins; the first one is the neighbour\'s.',
  'Cattle guard at the entrance. Close the gate behind you.',
  'Park by the shop, not the house. Owner works days.',
  'Long gravel drive — high clearance helps after rain.',
  'Call on arrival; the gate is chained but not locked.',
  'Enter from the county road, not the highway frontage.',
  'Panel is on the north side of the barn.',
  'Gate code 0917. Watch for equipment in the lane.',
  'No one on site weekdays — access is open, just sign the sheet in the shed.',
];

interface Bucket {
  pre: PreInstallStatus;
  assigned: boolean;
  weight: number;
}
const BUCKETS: Bucket[] = [
  { pre: 'ready_for_assignment', assigned: false, weight: 22 },
  { pre: 'assigned', assigned: true, weight: 16 },
  { pre: 'route_planned', assigned: true, weight: 8 },
  { pre: 'in_progress', assigned: true, weight: 14 },
  { pre: 'photos_submitted', assigned: true, weight: 8 },
  { pre: 'under_review', assigned: true, weight: 6 },
  { pre: 'retake_required', assigned: true, weight: 5 },
  { pre: 'approved', assigned: true, weight: 4 },
  { pre: 'complete', assigned: true, weight: 3 },
  { pre: 'unable_to_access', assigned: true, weight: 3 },
  { pre: 'address_problem', assigned: true, weight: 2 },
  { pre: 'customer_contact_required', assigned: true, weight: 2 },
];
const BUCKET_TOTAL = BUCKETS.reduce((s, b) => s + b.weight, 0);

function pickBucket(r: number): Bucket {
  let x = r * BUCKET_TOTAL;
  for (const b of BUCKETS) {
    if (x < b.weight) return b;
    x -= b.weight;
  }
  return BUCKETS[0];
}

function iso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

export function buildSeed(): SeedData {
  const rng = mulberry32(20260723);
  const farms: Farm[] = [];
  const photos: Photo[] = [];
  const submissions: Submission[] = [];
  const problems: Problem[] = [];
  const activity: ActivityEvent[] = [];
  const notifications: AppNotification[] = [];
  const boxInstallations: BoxInstallation[] = [];
  const now = new Date().toISOString();
  let glowSeq = 10001;
  let nameCursor = 0;
  let reviewQueueSeeded = 0;

  for (const st of STATES) {
    for (let i = 0; i < st.count; i++) {
      const bucket = pickBucket(rng());
      const idNum = String(i + 1).padStart(3, '0');
      const id = `farm-${st.code}-${idNum}`;
      const glowFarmId = `GF-${glowSeq++}`;
      const city = st.cities[Math.floor(rng() * st.cities.length)];
      const street = STREETS[Math.floor(rng() * STREETS.length)];
      const houseNo = 100 + Math.floor(rng() * 8900);
      const lat = st.center.lat + (rng() - 0.5) * st.spread;
      const lng = st.center.lng + (rng() - 0.5) * st.spread;
      // ~6% of farms have no coordinates yet (exercises the route "skipped" path)
      const hasLoc = rng() > 0.06;

      const assigned = bucket.assigned;
      const pre = bucket.pre;
      const overall = deriveOverallFromPreInstall(pre, 'pre_install_needed');
      const scheduledOffset = Math.floor(rng() * 9) - 2; // -2..+6 days (some overdue)
      const done = pre === 'approved' || pre === 'complete';

      const farm: Farm = {
        id,
        glowFarmId,
        hubRecordId: `HUB-${glowFarmId.slice(3)}`,
        name: FARM_NAMES[nameCursor++ % FARM_NAMES.length],
        address: `${houseNo} ${street}, ${city}, ${st.code}`,
        location: hasLoc ? { lat, lng } : undefined,
        state: st.name,
        region: `${st.code} ${i < st.count / 2 ? 'North' : 'South'}`,
        tripId: assigned ? `${st.code}-trip-1` : undefined,
        assignedPhotographerId: assigned ? st.photographerId : undefined,
        overallStatus: overall,
        preInstallStatus: pre,
        ptoStatus: 'not_reached',
        scheduledDate: assigned ? iso(scheduledOffset).slice(0, 10) : undefined,
        completionDate: done ? now : undefined,
        accessInstructions: rng() > 0.6 ? ACCESS_NOTES[Math.floor(rng() * ACCESS_NOTES.length)] : undefined,
        contact:
          assigned && rng() > 0.5
            ? {
                name: CONTACT_NAMES[Math.floor(rng() * CONTACT_NAMES.length)],
                phone: '+1 555 010 ' + String(1000 + Math.floor(rng() * 8999)),
              }
            : undefined,
        notes: pre === 'address_problem' ? 'Address pin lands in an empty field — verify with customer.' : undefined,
        createdAt: now,
        updatedAt: now,
      };
      farms.push(farm);

      // Field problems for problem-status farms.
      if (pre === 'unable_to_access' || pre === 'address_problem' || pre === 'customer_contact_required') {
        problems.push({
          id: `prob-${id}`,
          farmId: id,
          glowFarmId,
          type:
            pre === 'unable_to_access'
              ? 'locked_gate'
              : pre === 'address_problem'
                ? 'address_inaccurate'
                : 'no_one_home',
          note: 'Reported from the field.',
          reportedBy: st.photographerId,
          reportedAt: iso(-1),
          resolved: false,
        });
        notifications.push({
          id: `ntf-prob-${id}`,
          userId: 'u-jared',
          type: 'problem_reported',
          title: 'Problem reported',
          body: `${glowFarmId} · ${farm.name}`,
          farmId: id,
          glowFarmId,
          read: false,
          createdAt: iso(-1),
        });
      }

      // Pre-populate the review queue for a few submitted/under-review/retake farms.
      const wantsPhotos =
        (pre === 'photos_submitted' || pre === 'under_review' || pre === 'retake_required') &&
        reviewQueueSeeded < 6;
      if (wantsPhotos) {
        reviewQueueSeeded++;
        const items = DEFAULT_PRE_INSTALL_CHECKLIST.filter((c) => c.required);
        const photoIds: string[] = [];
        items.forEach((item, idx) => {
          const rejected = pre === 'retake_required' && idx === 1;
          const pid = `photo-${id}-${item.key}`;
          photoIds.push(pid);
          photos.push({
            id: pid,
            farmId: id,
            glowFarmId,
            phase: 'pre_install',
            checklistItemId: item.id,
            checklistKey: item.key,
            fileName: buildPhotoFileName({ glowFarmId, phase: 'pre_install', checklistKey: item.key, index: 1, dateIso: now }),
            localKey: `seed/${id}/${item.key}.jpg`, // no binary; UI shows a placeholder tile
            source: 'camera',
            syncState: 'uploaded',
            attempts: 0,
            reviewState: rejected ? 'rejected' : 'pending',
            rejectionReason: rejected ? 'blurry' : undefined,
            reviewNote: rejected ? 'Panel label unreadable — please retake in better light.' : undefined,
            capturedAt: iso(-1),
            capturedBy: st.photographerId,
            location: farm.location,
          });
        });
        submissions.push({
          id: `sub-${id}`,
          farmId: id,
          glowFarmId,
          phase: 'pre_install',
          submittedBy: st.photographerId,
          submittedAt: iso(-1),
          status: pre === 'photos_submitted' ? 'submitted' : pre === 'under_review' ? 'under_review' : 'retake_required',
          photoIds,
        });
        activity.push({
          id: `act-sub-${id}`,
          farmId: id,
          glowFarmId,
          kind: 'submitted',
          message: `Submitted ${photoIds.length} photos for review`,
          byUserId: st.photographerId,
          at: iso(-1),
        });
        notifications.push({
          id: `ntf-sub-${id}`,
          userId: 'u-jared',
          type: 'photos_submitted',
          title: 'Photos submitted for review',
          body: `${glowFarmId} · ${farm.name}`,
          farmId: id,
          glowFarmId,
          read: false,
          createdAt: iso(-1),
        });
      }

      // A creation activity entry for every farm.
      activity.push({
        id: `act-new-${id}`,
        farmId: id,
        glowFarmId,
        kind: 'imported',
        message: `Farm imported from Hub (${farm.address})`,
        byUserId: 'u-jared',
        at: farm.createdAt,
      });
    }
  }

  // ---- Box-installation-stage farms (Phase 2 demo data) ----
  const boxCities = ['Denver', 'Boulder', 'Longmont', 'Greeley', 'Loveland', 'Parker'];
  const boxPlan: {
    box: BoxInstallStatus;
    installer?: string;
    connectivity?: ConnectivityStatus;
    withPhotos?: boolean;
    complete?: boolean;
  }[] = [
    { box: 'ready_for_assignment' },
    { box: 'ready_for_assignment' },
    { box: 'ready_for_assignment' },
    { box: 'ready_for_assignment' },
    { box: 'assigned', installer: 'u-sam' },
    { box: 'assigned', installer: 'u-sam' },
    { box: 'assigned', installer: 'u-sam' },
    { box: 'hardware_installed', installer: 'u-sam', connectivity: 'passed' },
    { box: 'hardware_installed', installer: 'u-sam', connectivity: 'passed' },
    { box: 'connectivity_failed', installer: 'u-sam', connectivity: 'failed' },
    { box: 'post_install_photos_submitted', installer: 'u-sam', connectivity: 'passed', withPhotos: true },
    { box: 'complete', installer: 'u-sam', connectivity: 'passed', complete: true },
  ];
  boxPlan.forEach((plan, i) => {
    const id = `farm-BOX-${String(i + 1).padStart(3, '0')}`;
    const glowFarmId = `GF-${glowSeq++}`;
    const city = boxCities[i % boxCities.length];
    const farm: Farm = {
      id,
      glowFarmId,
      hubRecordId: `HUB-${glowFarmId.slice(3)}`,
      name: `${['Mesa', 'Boulder', 'Prairie', 'Foothill', 'Aspen', 'Cedar'][i % 6]} ${['Solar Farm', 'Ranch', 'Acres', 'Fields'][i % 4]}`,
      address: `${200 + Math.floor(rng() * 7000)} ${STREETS[i % STREETS.length]}, ${city}, CO`,
      location: { lat: 39.9 + (rng() - 0.5) * 1.0, lng: -104.9 + (rng() - 0.5) * 1.0 },
      state: 'Colorado',
      region: 'CO North',
      tripId: 'CO-install-1',
      assignedPhotographerId: 'u-dan',
      assignedInstallerId: plan.installer,
      overallStatus: deriveOverallFromBoxInstall(plan.box, 'box_install_ready'),
      preInstallStatus: 'complete',
      ptoStatus: 'reached',
      boxInstallStatus: plan.box,
      boxSerial: plan.connectivity ? `GLOW-BOX-${glowFarmId.slice(3)}` : undefined,
      equipmentDetails: '5.2 kW system · SolarEdge inverter',
      scheduledDate: iso(Math.floor(rng() * 6)).slice(0, 10),
      completionDate: plan.complete ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };
    farms.push(farm);

    activity.push({
      id: `act-box-${id}`,
      farmId: id,
      glowFarmId,
      kind: 'status_change',
      message: 'PTO reached — ready for box installation',
      byUserId: 'u-jared',
      at: iso(-3),
    });

    if (plan.connectivity) {
      boxInstallations.push({
        id: `inst-${id}`,
        farmId: id,
        glowFarmId,
        boxSerial: `GLOW-BOX-${glowFarmId.slice(3)}`,
        installerId: plan.installer ?? 'u-sam',
        installedAt: iso(-1),
        location: farm.location,
        boxVersion: 'v3.2',
        powerSupply: '120V AC adapter',
        electricalSystemType: 'Split-phase',
        voltage: '240V',
        phaseConfig: 'Single-phase',
        ctConfig: '2 × 200A',
        ctRatio: '200:0.1',
        networkType: 'cellular',
        simInfo: 'SIM 8901-•••• (Verizon)',
        programmingCompleted: true,
        serverConnected: plan.connectivity === 'passed',
        connectivityTest: {
          status: plan.connectivity,
          testedAt: iso(-1),
          readings:
            plan.connectivity === 'passed'
              ? '12.4 kWh baseline, RSSI -71 dBm'
              : 'No server handshake after 3 attempts',
        },
        followUpRequired: plan.connectivity === 'failed',
        finalApproved: !!plan.complete,
        createdAt: iso(-1),
        updatedAt: iso(-1),
      });
    }

    if (plan.withPhotos) {
      const items = DEFAULT_POST_INSTALL_CHECKLIST.filter((c) => c.required);
      const photoIds: string[] = [];
      items.forEach((item) => {
        const pid = `photo-${id}-${item.key}`;
        photoIds.push(pid);
        photos.push({
          id: pid,
          farmId: id,
          glowFarmId,
          phase: 'post_install',
          checklistItemId: item.id,
          checklistKey: item.key,
          fileName: buildPhotoFileName({ glowFarmId, phase: 'post_install', checklistKey: item.key, index: 1, dateIso: now }),
          localKey: `seed/${id}/${item.key}.jpg`,
          source: 'camera',
          syncState: 'uploaded',
          attempts: 0,
          reviewState: 'pending',
          capturedAt: iso(-1),
          capturedBy: 'u-sam',
          location: farm.location,
        });
      });
      submissions.push({
        id: `sub-${id}`,
        farmId: id,
        glowFarmId,
        phase: 'post_install',
        submittedBy: 'u-sam',
        submittedAt: iso(-1),
        status: 'submitted',
        photoIds,
      });
      notifications.push({
        id: `ntf-sub-${id}`,
        userId: 'u-jared',
        type: 'photos_submitted',
        title: 'Post-install photos submitted',
        body: `${glowFarmId} · ${farm.name}`,
        farmId: id,
        glowFarmId,
        read: false,
        createdAt: iso(-1),
      });
    }

    if (plan.installer && plan.box !== 'complete') {
      notifications.push({
        id: `ntf-inst-${id}`,
        userId: 'u-sam',
        type: 'new_assignment',
        title: 'Box installation assigned',
        body: `${glowFarmId} · ${farm.name}`,
        farmId: id,
        glowFarmId,
        read: false,
        createdAt: iso(-2),
      });
    }
  });

  // A welcome assignment notification for Dan.
  notifications.push({
    id: 'ntf-assign-dan',
    userId: 'u-dan',
    type: 'new_assignment',
    title: 'New assignment: Colorado',
    body: `${farms.filter((f) => f.assignedPhotographerId === 'u-dan').length} farms assigned to you`,
    read: false,
    createdAt: iso(-2),
  });

  return { users: SEED_USERS, farms, photos, submissions, problems, activity, notifications, boxInstallations };
}
