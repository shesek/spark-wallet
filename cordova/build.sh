#!/bin/bash
set -xeo pipefail

mkdir -p www
rm -rf www/*

export BUILD_TARGET=cordova
(cd ../client && DEST=../cordova/www npm run dist)
