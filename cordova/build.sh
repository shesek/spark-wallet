#!/bin/bash
set -xeo pipefail

[[ -d node_modules ]] || npm install

export BUILD_TARGET=cordova
export DEST=`pwd`/www

mkdir -p $DEST && rm -rf $DEST/*

(cd ../client && npm run dist)

cordova prepare
cordova build "$@"

# give the .apk file a more descriptive name
apkname=spark-wallet-`node -p 'require("../package").version'`.apk
(cd platforms/android/app/build/outputs/apk/$([[ "$@" == *"--release" ]] && echo release || echo debug) \
  && mv app-*.apk $apkname)
