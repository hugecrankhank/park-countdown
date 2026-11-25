#!/usr/bin/env bash
set -euo pipefail
# Build from the exact original release, not the overwritten preview index.
BASE=f18d9edcd62c3d0610f01b60aeec6be9da1a33e2
if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then git fetch --no-tags origin "$BASE"; fi
rm -rf dist
mkdir dist
git archive "$BASE" | tar -x -C dist
# Cloudflare Pages Functions are built from the repository root, not the output.
rm -rf dist/.github dist/functions dist/.gitignore
cp companion.html companion.js integration.js manifest.webmanifest icon-192.png icon-512.png sw-integrated.js dist/
# Existing V2 workers register this same URL; replace old cached app shell.
cp dist/sw-integrated.js dist/sw.js
node patch-original.cjs dist/index.html
printf 'Integrated preview built from %s\n' "$BASE"
