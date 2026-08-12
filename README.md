# Glow Field Operations

The field-operations layer between the **Glow Hub** and the people doing pre-install
photography, post-install photography, and monitoring-box installs. It runs the full field
lifecycle — pre-install photos → PTO → box installation → post-install photos → review — as
one universal **Expo (React Native)** app on **iOS, Android, and web**.

> Scope so far: the pre-install photography MVP (requirements §17) **plus** the monitoring-box
> installation + post-install photography workflow (§4/§11). Live Google Drive, DJI, push
> notifications, and two-way Hub sync remain deferred — the data model and status system
> already account for them so they slot in without rework.

## Quick start

```bash
npm install
npx expo start      # press w for web, i for iOS, a for Android
# or target one platform:
npm run web
```

No accounts or API keys are required. A fresh install starts **empty** — one administrator
(`jared@glow.org`) and nothing else. Sign in with that address, then **More → Import farms** and
**More → People** to put real data in.

To see the app with data in it without typing any, use **More → Load sample data** (67 farms across
two states, a crew, and a populated review queue). It's opt-in and confirm-gated, and it lives in a
lazily-imported chunk so none of it ships in the main bundle.

## End-to-end demo (5 minutes)

1. **Sign in as Jared** → the **Dashboard** shows only what needs him: reviews waiting, problems,
   overdue, retakes, unassigned farms, farms with no map pin. Each row disappears at zero. The full
   counts live on **More → Progress**.
2. **Assign** → open **Assign**, pick a photographer, tap "All Colorado", and assign the
   unassigned queue in one move. (Or **Farms → Import** to load farms from CSV.)
3. **Sign out, sign in as Dan** → **Today** shows his Colorado assignment: totals,
   recommended stops, first stop + estimated drive time, and an optimized **Route** that
   hands off to Apple/Google Maps.
4. **Open a farm → Pre-install checklist** → four required shots (front of property, address
   verification, roof/panel location, property overview) via **Camera** or **Import**, plus a
   free-text **obstructions note**. Tap the **sync chip** to go **Offline** first: photos queue
   locally and upload when you flip back online. Required-photo gaps block submit.
5. **Submit for review** → the app auto-advances to the next farm.
6. **Sign back in as Jared → Review** → open the submission, **approve** or tap photos to
   **request retakes** with a reason. The farm status + activity history update live, and
   Dan gets an alert. Rejected items show up back on Dan's checklist as retakes.

Use **More → Erase all data** to start over. Both data actions are behind a confirm.

## Box-installation demo (the second half of the lifecycle)

1. **As Jared**, open a farm whose pre-install photos are **Approved** and tap
   **Mark PTO reached** — it moves into the box-installation queue. (Several farms are
   pre-seeded past this point already.)
2. **Assign → Box install** → pick **Sam** and assign the ready farms.
3. **Sign in as Sam** → **Today** shows his installation queue. Open a farm to record the
   **box serial** (tap **Scan** to simulate), electrical + network details, run the
   **connectivity test** (pass/fail), and shoot the **post-install checklist**, then **Submit**.
4. **Back as Jared → Review** → the post-install set shows the monitoring-box summary;
   **approve** to mark the farm **Field Operations Complete**, or request a correction.

The dashboard's **Box installation** row tracks PTO reached, ready-for-install, in-progress,
installed-but-not-connected, and field-ops-complete counts.

## Branding

Styled to the **Glow brand guidelines (May 2025)**. Colours, gradient stops, and the logo
vectors are taken verbatim from the official brand kit — nothing is approximated.

- **Palette** (`src/theme/index.ts`): black `#050505`, white `#FFFFFF`, medium grey `#F3F3F3`,
  light grey `#FAFAFA`, and orange `#FFB472`. Per the guide, orange is an **accent only** — it's
  used as a fill (progress bars, emphasis), never as small text, where the pastel tone would
  fail contrast on white.
- **Gradients** (`src/components/brand/GlowGradient.tsx`): the published stops
  `#F7FCC4 → #CCFFD4 (33.7%) → #DCC4FF` at the brand's diagonal, reserved for hero surfaces
  (login, splash) as the guide intends — never behind body copy.
- **Logo** (`src/components/brand/GlowLogo.tsx`): the 8-petal symbol and the "Glow" wordmark
  rendered from the brand kit's own vector paths, so they're crisp at any size and need no font
  licence. App icon, favicon, splash and Android adaptive icons are generated from the same symbol.
- **Glow Grid** (`src/components/brand/GlowGrid.tsx`): the brand's lattice graphic device, layered
  at low opacity over the gradient heroes as the site layers it. It's a regular 12×12 lattice, so
  it's generated parametrically rather than embedding ~4.5 KB of equivalent path data.
- **Icons** (`src/components/brand/GlowIcon.tsx`): a drawn set of 43, not a library and not emoji.
  Each sits on a 24×24 grid, stroked at 1.75 with square caps and mitre joins, and contains **no
  curves** — the Glow symbol has none, so neither do these. Its eight rhombus petals are the
  recurring device: the camera's lens, the clock face, the pin head, the key bow, the settings
  handles, the sun in `today`, the field in `farms`. Silhouettes stay conventional so a camera
  still reads as a camera at arm's length in sunlight. `IconName` is a literal union, so a wrong
  name is a compile error rather than a missing glyph.
- **Type** — the brand faces are **Söhne** (Klim) for sans and **Duplicate Slab** (e-Types) for
  the secondary serif. Both are commercially licensed and therefore not bundled. **Archivo**
  (400/500/600/700) stands in: Söhne is drawn on Akzidenz-Grotesk bones and so is Archivo, so it
  carries the same squared terminals and tight apertures. (Inter — the obvious free grotesque, and
  the default on every generated app — is a screen-first Helvetica descendant and reads generic
  here.) Imported from per-weight subpaths, not the package root, which would bundle all 18 faces
  (~5.9 MB) instead of the 4 in use (~480 KB).
  **To use the real Söhne:** drop the files in `assets/fonts/`, register them in the `useFonts`
  call in `src/app/_layout.tsx`, and point the `sans*` tokens in `src/theme/index.ts` at them.
  Duplicate Slab is deliberately unused — glow.org sets its display copy in the sans.
- **Site language carried into the app** (from glow.org): uppercase letterspaced micro-labels
  (`Txt variant="overline"`) for section markers, **monospace for data readouts** — Glow farm
  IDs, serials, coordinates — the way the site sets its hex values, and surfaces separated by
  soft grey fills rather than outlines.
- Status colours (green/amber/red) are **functional, not brand** — kept legible but desaturated
  to sit comfortably alongside the pastels.

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
- **People** (`src/app/(admin)/people.tsx`) — add, edit and deactivate the crew. Email is the
  sign-in key, so it's unique-checked, and the last active administrator can't lock themselves out.
- **Check-ins** (`src/features/checkin/`) — one high-accuracy GPS read when a farm's checklist opens,
  compared against the farm's pin at a **0.1 mi** threshold. Photos carry the device's coordinates,
  not the farm's. Never blocks the camera: the classifier distinguishes *off site* from *no GPS*,
  *no map pin on the farm*, and *fix too imprecise to judge*, and only the first is flagged to the
  office. Pure and unit-tested.
- **Offline outbox** (`src/features/sync/` + `src/stores/syncStore.ts`) — writes are
  optimistic; each queues an idempotent task drained when online. The simulated uploader is
  the single point a real one replaces. Connectivity = NetInfo + a dev override toggle.
- **Routing** (`src/features/routing/`) — nearest-neighbour seed, then 2-opt (removes
  crossings) and Or-opt (relocates a stranded stop) improvement, then leg rebuild. The start
  point is chooseable: device GPS, one of your farms, or a typed address/coordinates.
  Skips farms missing coordinates + Apple/Google Maps deep links.
- **Import** (`src/features/import/`) — CSV and (on desktop) table PDFs normalise to one
  shared validator. Requires Farm ID + Name + address **or** coordinates; imports customer contact
  columns; flags duplicate Farm IDs (which would otherwise corrupt the geocode backfill); says how
  many rows update vs. create before you commit; and ships a downloadable template. Address-only rows
  can be geocoded to map pins via free OpenStreetMap lookup (`src/features/geo/geocode.ts`).
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
npx jest                    # 78 unit tests (route optimizer, naming, status, outbox, CSV, RBAC, checklist)
npx expo export --platform web   # proves the universal build (catches web-incompatible imports)
```

## Deferred to later phases (already modelled)

Live Google Drive upload · real barcode/QR serial scanning (the **Scan** button is simulated
today) · DJI integration · automatic PTO from the Hub & two-way Hub sync (PTO is a manual
button today) · push notifications · automated audit-package prep · real cloud auth/DB.

## Open product decisions (requirements §20)

Sensible defaults are used and flagged for later: exact mandatory photo list & whether drone
shots are always required · system ownership & hosting · contractor access to customer
contact info · route optimization criterion · box-record fields & connectivity-test
definition · which system is authoritative per field. Checklists are data-driven, so they
change without code edits.
