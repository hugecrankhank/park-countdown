#!/usr/bin/env bash
set -euo pipefail
BASE=f18d9edcd62c3d0610f01b60aeec6be9da1a33e2
EXPECTED=248be27f1541d0890c8611c36c6beda07f2e237b
RAW="https://raw.githubusercontent.com/hugecrankhank/park-countdown/$BASE/index.html"
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist
# Cloudflare can use a shallow checkout; avoid fetching Git history.
if git show "$BASE:index.html" > dist/index.html 2>/dev/null; then
  echo 'Original HTML recovered from local checkout.'
else
  echo 'Original commit not in checkout; retrieving pinned public source.'
  curl --fail --location --silent --show-error --retry 2 "$RAW" -o dist/index.html
fi
actual=$(git hash-object dist/index.html)
if [[ "$actual" != "$EXPECTED" ]]; then
  echo "Unexpected original HTML blob: $actual (expected $EXPECTED)" >&2
  exit 1
fi
for file in apple-touch-icon.png apple-touch-icon-bw.png version.txt companion.html companion.js integration.js manifest.webmanifest icon-192.png icon-512.png sw-integrated.js account.js account.css qr-local.js; do
  if [[ ! -f "$file" ]]; then echo "Required file missing at repository root: $file" >&2; exit 1; fi
  cp "$file" dist/
done
cp dist/sw-integrated.js dist/sw.js
node configure-accounts.cjs dist/account-config.js
node patch-original.cjs dist/index.html
printf 'Integrated preview ready: dist/index.html\n'
