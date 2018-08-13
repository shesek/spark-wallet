#!/bin/bash
set -xeo pipefail

[[ -d node_modules ]] || npm install

export BUILD_TARGET=cordova
export DEST=`pwd`/www

mkdir -p $DEST && rm -rf $DEST/*

(cd ../client && npm run dist)

version=`node -p 'require("../package").version'`

# override the version number for the android cordova app with the version number of the main package,
# transformed from x.y.z versions to numeric android versions, using the same algorithm used by cordova:
# https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#setting-the-version-code)
# this is done so that we don't have to maintain a duplicated version number in cordova's config files
androidVer=`node -p 'const p = require("../package").version.split("-")[0].split(".").map(Number);p[0]*1000+p[1]*100+p[2]'`

cordova prepare
cordova build android "$@" -- --versionCode=$androidVer

# remove previous build and give the .apk file a more descriptive name
(cd platforms/android/app/build/outputs/apk/$([[ "$@" == *"--release" ]] && echo release || echo debug) \
  && rm -f spark-wallet-*-android.apk \
  && mv app-*.apk spark-wallet-$version-android.apk)
