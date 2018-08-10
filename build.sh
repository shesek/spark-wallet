#!/bin/bash
set -xeo pipefail

mkdir -p dist
rm -rf dist/*

babel -d dist src

(cd client && DEST=../dist/www npm run dist)

# Remove sources of non-determinism
chmod -R 755 dist
TZ=UTC find dist -exec touch -t "1711081658.41" {} \;
# this is done automatically since npm v5.7.1, but the latest stable 5.7.x and 5.8.x are currently buggy (https://github.com/npm/npm/issues/19989)

# Package to spark-wallet-[x.y.z]-npm.tgz
if [[ "$1" == "--pack-tgz" ]]; then
  rm -f spark-wallet-*-npm.tgz
  packpath=`npm pack`
  mv $packpath ${packpath/.tgz/-npm.tgz}
fi
