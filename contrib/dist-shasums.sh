#!/bin/bash
set -eo pipefail

sha256sum spark-wallet-*-npm.tgz \
          electron/dist/*.{AppImage,deb,snap,tar.gz,exe,zip} \
          cordova/platforms/android/app/build/outputs/apk/release/*.apk \
  | sed 's~ [^ ]*/~ ~'
