#!/bin/bash
set -xeo pipefail

mkdir -p dist
rm -rf dist/*

babel -d dist src

(cd client && DEST=../dist/www npm run dist)

if [[ -n "$PACK_TGZ" ]]; then
  packpath=`npm pack`
  mv $packpath ${packpath/.tgz/-npm.tgz}
fi
