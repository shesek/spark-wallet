#!/bin/bash
set -xeo pipefail

mkdir -p www
rm -rf www/*

export BUILD_TARGET=cordova
export DEST=`pwd`/www

(cd ../client && npm run dist)
