PARK DAY COUNTDOWN — INTEGRATED PHASES 1–7

GOAL: restore the original PWA, not a replacement. Production is not changed.
The build archives the exact verified original commit f18d9edcd62c3d0610f01b60aeec6be9da1a33e2
from main, retains its assets, original HTML/JS/CSS, original data keys and
IndexedDB picture packs, and adds a manifest link and integration script.
The compiled index is in dist/index.html. The branch's old root index is not
used by this build. The added screens use a same-origin, embedded companion
so its styles cannot overwrite the original interface.

DEPLOY ON development/v2 ONLY
1. Export a backup from the existing preview if you have data in it.
2. Extract the ZIP. Upload all root-level files (except this README if desired)
   to the ROOT of development/v2. The tests directory is optional.
   Keep original repo files, especially the original icon files and functions.
3. In Cloudflare Dashboard > Workers & Pages > park-countdown-v2 > Settings >
   Builds & deployments / Build configuration, retain development/v2 as the
   production branch for this preview project. Framework: None. Root: blank.
   Build command: bash build-integrated.sh
   Build output directory: dist
4. Save and redeploy the latest commit. The build uses git archive; on a shallow
   clone it fetches the pinned commit. The original repo must remain accessible.
5. Open https://park-countdown-v2.pages.dev/ in Safari, refresh and reopen the PWA.
   The five original tabs should return, plus More. More displays V2.7 integrated.
   Do not change the original GitHub Pages site or merge to main.

WHAT TO EXPECT
Original Home: castle scene, balloons, countdown, reservation countdown, original
crowd calendar, trip day view, favorite ride ticker. When a hotel is chosen,
a separate rotating resort gallery appears below the original countdown. The
companion card adds preparation, next activity and reminder summaries.
Original Queue times: original multi-park favorites and images, plus Smart waits
shortcut. Original getLive samples feed the companion history on opening it.
Original Parks & Rides: destinations, search, expandable parks, favorites,
individual photos and ZIP picture packs, plus passport shortcut.
Original Map: Leaflet map, map style, GPS route, hourly walking and Health
Shortcut sync, unchanged. Original walking data feeds companion totals.
Original Trips: unchanged original trip editor/calendar and icon choices,
with links to planner, resort selection, trip history and settings. New trips
are created/edited in the original editor. Select an original trip in the
companion for detailed activities, hotel, budget, preparation and memories.
More: embedded companion tabs: Planner, Resorts, Smart waits, Passport,
Memories and Settings. It reads original trip IDs, park day plans and walking
records. It retains the V2 data key, prior galleries and detailed records.
Earlier preview-only trips can be imported via Trips > Bring over preview trips.
Unknown destination defaults to Walt Disney World on import; edit if needed.
Companion metadata of removed original trips is retained but not re-created.

DATA LIMITATIONS
Production GitHub Pages and Cloudflare preview are separate browser origins.
The production browser's 145 picture-pack images, trips and local walking data
cannot automatically transfer. Re-import authorized original picture-pack ZIPs
in Parks & Rides on V2. Create trips or import earlier same-site V2 trips.
The same Apple Health sync code can be entered in Map if you want to use that
existing service; verify the sync on your phone. Original code still uses the
original calendar/health endpoints. No service or production data was modified.
The resort gallery uses personal/authorized photographs. No resort photos are
bundled. Smart wait alerts remain foreground/selected-park alerts in the
companion; the original wait reads additionally feed sampled history. No push
backend or native iOS/Watch features are implemented. The original custom icon
selection code is preserved; installed app icon behavior needs iPhone testing.

TESTING
node --check integration.js
node --check companion.js
node --check sw-integrated.js
node tests/smoke.cjs
node tests/embedded.cjs
node tests/patch.cjs
All pass in the development environment. These are mocked workflow checks and
an additive patch fixture, not full iOS or live browser regression tests. The
pinned original source and all patch markers were verified via GitHub. The
Cloudflare build itself cannot be run here because the container cannot reach
GitHub, and GitHub previously denied writes to the development branch. The
first real deployment must be checked for the build result, original maps and
picture packs, time zone handling, image upload, Apple Health sync, calendar
links, original icon switching, foreground wait alerts and PWA caching.
Trigger new Cloudflare deployment.
