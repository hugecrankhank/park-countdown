PARK DAY COUNTDOWN — HOME RESORT CAROUSEL

Replace integration.js at the ROOT of development/v2. Keep the current
Cloudflare integrated build settings (bash build-integrated.sh, output dist).
The build already copies integration.js into dist, so no build changes are needed.
Commit to development/v2 only; let Cloudflare deploy the new commit.
Do not merge into main. If the earlier integrated deployment has not succeeded,
this update still needs that deployment to succeed before it can be seen.

Home: A photo carousel below the original countdown shows the catalog even
without a saved trip. Photos rotate every 15 seconds while Home is visible,
with next/previous, pause and My resort / All resorts controls. My resort uses
the hotel selected in More > Resorts; personal images are included without
altering prior uploads or stored trip data. Resort credits and license links
are visible below each photograph. Photo files are externally hosted on
Wikimedia Commons, not embedded in this package. Internet access is needed;
unavailable images are skipped, with a readable message if none load.

All 21 named WDW hotels in the current list are covered (22 photo references).
Off-site / other has no default photo. This package does not add default
photos to the companion Explore cards; the requested Home gallery is the focus.

Tested: JS syntax and catalog/selection logic (node test-gallery.cjs).
Live image loading, installed PWA and Cloudflare deployment are not verified.
See RESORT-PHOTO-CREDITS.txt for full source credits; images remain under their
individual licenses. The file URLs reference the corresponding Commons file,
with responsive thumbnail and original-file fallback; not official Disney art.
