#!/bin/bash
set -eo pipefail

docker_name=shesek/spark-wallet

sha256sum spark-wallet-*-npm.tgz \
          electron/dist/*.{AppImage,deb,snap,tar.gz,exe,zip} \
          cordova/platforms/android/app/build/outputs/apk/{debug,release}/*.apk \
  2> /dev/null \
  | sed 's~ [^ ]*/~ ~' \
  || true # don't fail on missing files

# Get hash digest for docker image
if command -v docker > /dev/null; then
  version=`node -p 'require("./package.json").version'`

  for name in "$version-amd64" "$version-standalone-amd64" "$version-standalone-arm32v7" "$version-standalone-arm64v8"
  do
    dockerhash=`docker inspect --format='{{index .RepoDigests 0}}' $docker_name:$name 2> /dev/null | cut -d: -f2 \
                || echo >&2 WARN: docker digest missing`
    [[ -z "$dockerhash" ]] || echo "$dockerhash  spark-wallet-docker-$name"
  done
fi
