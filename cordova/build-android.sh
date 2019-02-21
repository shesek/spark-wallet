#!/bin/bash
set -xeo pipefail

[[ -d node_modules ]] || npm install

export BUILD_TARGET=cordova
export DEST=`pwd`/www

mkdir -p $DEST && rm -rf $DEST/*

[ -z "$SKIP_CLIENT" ] && (cd ../client && npm run dist)

version=`node -p 'require("../package").version'`
androidVer=`node -p 'require("../package").androidVer'`

build_type=${BUILD_TYPE:-debug}

cordova prepare
cordova build android --$build_type "$@" -- --versionCode=$androidVer

# remove previous build and give the .apk file a more descriptive name
(cd platforms/android/app/build/outputs/apk/$build_type \
  && rm -f spark-wallet-*-android.apk \
  && mv app-*.apk spark-wallet-$version-android-$build_type.apk)
