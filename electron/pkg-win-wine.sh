#!/bin/bash
set -xeo pipefail

docker run --rm -ti \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  ./node_modules/.bin/electron-builder "$@" --windows -c.extraMetadata.version=`node -p 'require("../package").version'`
