PARK DAY COUNTDOWN V2 — AUTOMATIC UPDATE + PICTURES TAB

Upload these three files to the ROOT of the development/v2 branch, replacing existing copies:
  integration.js
  patch-original.cjs
  sw-integrated.js
Commit all three together. The included integration.js also contains the previous Pictures tab update; no separate installation needed.

Keep the existing Cloudflare Pages settings:
  Production branch: development/v2
  Build command: bash build-integrated.sh
  Build output directory: dist
  Root directory: blank
Do not replace version.txt manually. Each changed build creates dist/version.txt automatically, sets the original HTML's BUILD constant, versions the scripts and service worker cache, and generates Cloudflare cache revalidation headers. The source version.txt on GitHub is not the deployed version file. The existing build script already invokes patch-original.cjs.

After deployment, open the V2 app and refresh once if the old version doesn't show an update prompt. Future changed builds display the original 'Update ready · tap to refresh' button. It checks on launch, return to the foreground, network reconnection, and every minute while visible. The app does not force reload during uploads or planning; tap the button when ready. No updates while offline; detection resumes when online. Picture packs, IndexedDB and localStorage keys are unchanged. Do not clear website data.

Tests (optional, not needed on GitHub): node test-update-logic.cjs; node test-resort-packs.cjs <batch1 ZIP>; python test-pictures-navigation.py. The test-auto-update.py full service worker browser fixture is also included; local server navigation was blocked by the test environment, so that test remains unverified. iOS and live Cloudflare deployment also need verification. No changes made to main or pushed to GitHub.
