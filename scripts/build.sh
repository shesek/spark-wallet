#!/bin/bash
set -xeo pipefail

mkdir -p dist
rm -rf dist/*

# Build server-side code
babel -d dist --ignore src/transport/granax-dep/node_modules src

# Copy granax-dep (on-demand installation for Tor)
cp src/transport/granax-dep/{package,npm-shrinkwrap}.json dist/transport/granax-dep/

# Build client-side www assets
(cd client && DEST=../dist/www npm run dist)

# Match the fixed timestamp and permission attributes used by the npm registry
# chmod -R 755 dist
TZ=UTC touch -t "8510260815.00" package.json npm-shrinkwrap.json README.md CHANGELOG.md LICENSE
TZ=UTC find dist -exec touch -t "8510260815.00" {} \;
# this is done automatically since npm v5.7.1, but the latest stable 5.7.x and 5.8.x are currently buggy (https://github.com/npm/npm/issues/19989)

# Package to spark-wallet-[x.y.z]-npm.tgz
if [[ "$1" == "--pack-tgz" ]]; then
  rm -f spark-wallet-*-npm.tgz
  packpath=`npm pack`
  mv $packpath ${packpath/.tgz/-npm.tgz}
fi
