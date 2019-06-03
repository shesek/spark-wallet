#!/bin/bash
set -xeo pipefail

mkdir -p dist
rm -rf dist/*

# Build server-side code
babel -d dist --ignore node_modules src

# Copy granax-dep (on-demand installation for Tor)
cp src/transport/granax-dep/{package,npm-shrinkwrap}.json dist/transport/granax-dep/

# Build client-side www assets
(cd client && DEST=../dist/www npm run dist)

# Remove sources of non-determinism
chmod -R a+rX dist package.json npm-shrinkwrap.json README.md CHANGELOG.md LICENSE
TZ=UTC touch -t "1711081658.41" package.json npm-shrinkwrap.json README.md CHANGELOG.md LICENSE
TZ=UTC find dist -exec touch -t "1711081658.41" {} \;
# this is done automatically since npm v5.7.1, but the latest stable 5.7.x and 5.8.x are currently buggy (https://github.com/npm/npm/issues/19989)

# Package to spark-wallet-[x.y.z]-npm.tgz
if [[ "$1" == "--pack-tgz" ]]; then
  rm -f spark-wallet-*-npm.tgz
  packpath=`npm pack`
  mv $packpath ${packpath/.tgz/-npm.tgz}
fi
