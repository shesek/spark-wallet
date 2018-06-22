#!/bin/bash
set -xeo pipefail
export PATH=../node_modules/.bin:$PATH

mkdir -p www
rm -rf www/*

export BUILD_TARGET=cordova
(cd ../client && DEST=../cordova/www npm run dist)

cordova prepare && cordova build
