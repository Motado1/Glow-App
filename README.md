# Glow Field Operations

The field-operations layer between the **Glow Hub** and the people doing pre-install
photography, post-install photography, and monitoring-box installs. This first release
implements the **pre-install photography workflow** end to end — assignment → routing →
photo capture → review/approval — as one universal **Expo (React Native)** app that runs
on **iOS, Android, and web**.

> Scope of this build: the MVP from the requirements doc (§17), starting with pre-install
> photography. Box installation, live Google Drive, DJI, push notifications, and two-way
> Hub sync are deliberately deferred — but the data model and status system already
> account for them so they slot in without rework.

## Quick start

```bash
npm install
npx expo start      # press w for web, i for iOS, a for Android
# or target one platform:
npm run web
```

No accounts or API keys are required — the app ships with a **local demo backend**
(seeded data on the device). On the login screen, tap any demo account to sign in.

### Demo accounts

| Person | Role | Sees |
| --- | --- | --- |
| **Jared** | Administrator | Everything: dashboard, all farms, assignment, review, import |
| **Dan Whitfield** | Field Photographer | Only farms assigned to him (Colorado) |
| **Maria Ortiz** | Field Photographer | Only farms assigned to her (Kansas) |
| **Sam Reeves** | Box Installer | Field surface (box-install flow lands in a later phase) |
| **Priya Nair** | Reviewer | Review queue + approvals |

## End-to-end demo (5 minutes)

1. **Sign in as Jared** → the **Dashboard** answers the ops questions (need pre-install,
   assigned, awaiting review, retakes, overdue, by-state completion).
2. **Assign** → open **Assign**, pick a photographer, tap "All Colorado", and assign the
   unassigned queue in one move. (Or **Farms → Import** to load farms from CSV.)
3. **Sign out, sign in as Dan** → **Today** shows his Colorado assignment: totals,
   recommended stops, first stop + estimated drive time, and an optimized **Route** that
   hands off to Apple/Google Maps.
4. **Open a farm → Pre-install checklist** → add photos with **Camera** or **Import**
   (drone/gallery). Tap the **sync chip** to go **Offline** first: photos queue locally and
   upload when you flip back online. Required-photo gaps block submit.
5. **Submit for review** → the app auto-advances to the next farm.
6. **Sign back in as Jared → Review** → open the submission, **approve** or tap photos to
   **request retakes** with a reason. The farm status + activity history update live, and
   Dan gets an alert. Rejected items show up back on Dan's checklist as retakes.

Use **More → Reset demo data** to start over.

## Architecture

Everything the UI touches goes through three swap-in **seams**, so a real cloud backend
(e.g. Supabase) drops in later by changing only `src/data/index.ts` — no UI churn.

- **`DataRepository`** (`src/data/repository.ts`) — all rows. `LocalRepository`
  (AsyncStorage + in-memory cache + a local event emitter for live updates) implements it now.
- **`FileStore`** (`src/data/files/`) — photo **binaries only**, never AsyncStorage.
  Native uses the filesystem; web uses IndexedDB. (Later: a Storage bucket.)
- **`AuthRepository`** (`src/data/auth/`) — demo email sign-in now; real auth later.

Other load-bearing pieces:

- **Status system** (`src/domain/status.ts`) — the full pre-install / box-install / overall
  vocabularies from §5 with a transition guard, not just "complete/incomplete".
- **RBAC** (`src/domain/permissions.ts`) — a photographer only ever sees their own farms.
- **Offline outbox** (`src/features/sync/` + `src/stores/syncStore.ts`) — writes are
  optimistic; each queues an idempotent task drained when online. The simulated uploader is
  the single point a real one replaces. Connectivity = NetInfo + a dev override toggle.
- **Routing** (`src/features/routing/`) — nearest-neighbour sequencing from a start point
  (skips farms missing coordinates) + Apple/Google Maps deep links.
- **Photos** (`src/features/photos/`) — configurable checklist, required-photo validation,
  and consistent file naming (`GlowFarmID_PreInstall_Meter_01_2026-07-23.jpg`).

### Project structure

```
src/
  app/                 # expo-router routes: (auth), (admin) tabs, (field) tabs
  components/          # UI primitives, FarmCard, platform-split FarmMap, PhotoThumb, SyncChip
  domain/              # types, status system, RBAC
  data/                # repository + FileStore + Auth seams, LocalRepository, seed, composition root
  stores/              # zustand (auth, sync) + reactive useRepoQuery hook
  features/            # routing, photos (capture/checklist/naming), import (CSV), sync (outbox)
  lib/                 # id, date, geo helpers
__tests__/             # pure-logic unit tests
```

## Verification

```bash
npx tsc --noEmit            # types
npx jest                    # 30 unit tests (route optimizer, naming, status, outbox, CSV, RBAC, checklist)
npx expo export --platform web   # proves the universal build (catches web-incompatible imports)
```

## Deferred to later phases (already modelled)

Live Google Drive upload · monitoring-box install flow + serial/QR scanning · connectivity
tests · DJI integration · PTO-triggered assignments & two-way Hub sync · push notifications ·
automated audit-package prep · real cloud auth/DB.

## Open product decisions (requirements §20)

Sensible defaults are used and flagged for later: exact mandatory photo list & whether drone
shots are always required · system ownership & hosting · contractor access to customer
contact info · route optimization criterion · box-record fields & connectivity-test
definition · which system is authoritative per field. Checklists are data-driven, so they
change without code edits.
