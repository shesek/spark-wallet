#!/bin/bash
set -xeo pipefail

# npm package
PACK_TGZ=1 npm run dist

# cordova
npm run dist:cordova -- --release

# electron
npm run dist:electron -- --linux --mac
npm run dist:electron:win
