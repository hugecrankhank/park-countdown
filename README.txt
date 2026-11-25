PARK DAY COUNTDOWN — RESORT PICTURE PACK SUPPORT

Development branch only: development/v2. Replace integration.js at the repository root. This is cumulative with the previous resort carousel update; no additional Cloudflare build settings are required. Integrated Phase 1–7 must already be deployed successfully. Do not replace the production main branch.

After deployment, open V2, select Parks & Rides, then scroll to Resort picture packs. Alternatively, select Picture packs on the Home resort carousel. Upload Resort-Picture-Pack-01.zip directly, without extracting it. Future packs can be imported in the same way. Images are stored separately from ride images in IndexedDB, not localStorage. Reimporting the same filename for the same resort replaces that image; other packs remain. Remove resort pack pictures clears only resort pack art, not personal photos or ride packs.

Home cycles imported artwork and personal resort pictures by default once available. My resort filters to the selected hotel, using online pictures if it has no custom artwork. Pause and previous/next controls remain. Resort art is stored on the current device only; keep ZIPs for backup and reimport on other devices. No image files need to be committed to GitHub. Imported images work locally even without Internet once the app shell is available.

ZIP format: JPEG, PNG or WebP files; manifest.json array with resort_name, file, kind (any/day/night), name. Filename-only matching also works with resort-name-scene.webp. ZIPs up to 32 MB, individual entries up to 3 MB, 300 entries maximum. Stored ZIPs supported; deflate ZIPs require browser DecompressionStream deflate-raw support. A provided pack uses stored ZIP entries for compatibility.

Testing: node --check integration.js and node test-resort-packs.cjs /path/to/Resort-Picture-Pack-01.zip. These verify actual ZIP parsing, mapping, invalid ZIP rejection and artwork selection. IndexedDB persistence, Safari file picker and live deployed carousel still need device tests.
