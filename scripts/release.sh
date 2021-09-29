#!/bin/bash
set -xeo pipefail

gh_repo=shesek/spark-wallet
docker_name=shesek/spark-wallet

[ -z "$1" ] && { echo >&2 "version bump argument required, e.g. $0 patch"; exit 1; }

# Bump version
if [[ "$1" != "nobump" ]]; then
  npm version --no-git-tag-version $1
  androidVer=`node -p 'require("./package").androidVer+1'`
  sed -ri 's/"androidVer": [0-9]+/"androidVer": '$androidVer'/' package.json
fi

version=`node -p 'require("./package").version'`

# Extract unreleased changelog & update version number
changelog="`sed -nr '/^## (Unreleased|'$version' )/{n;:a;n;/^## /q;p;ba}' CHANGELOG.md`"
grep '## Unreleased' CHANGELOG.md && sed -i "s/^## Unreleased/## $version - `date +%Y-%m-%d`/" CHANGELOG.md

# Try loading Android signing keys
[[ -z "$ANDROID_RELEASE_CONFIG" && -f ../spark-signing-keys/build.json ]] && ANDROID_RELEASE_CONFIG=`pwd`/../spark-signing-keys/build.json

echo -e "Building Spark v$version\n\n$changelog\n\n"

# Build NPM, Electron and Cordova dist files
if [[ -z "$SKIP_BUILD" ]]; then
  # clean up previous builds
  rm -rf docker-builds spark-wallet-*-npm.tgz dist electron/dist cordova/platforms/android/app/build/outputs/apk
  mkdir -p cordova/platforms/android/app/build/outputs/apk

  # Build using Docker for reproducibility
  if [[ -z "$NO_DOCKER_BUILDER" ]]; then
    docker build -f scripts/builder.Dockerfile -t spark-builder .
    # fuse required for reproducible apks, see doc/reproducible-builds.md
    docker run --cap-add SYS_ADMIN --device /dev/fuse --security-opt apparmor:unconfined \
               -it --rm -v `pwd`/docker-builds:/target -e OWNER=`id -u`:`id -g` \
               $([ -n "$ANDROID_RELEASE_CONFIG" ] && echo "-v $ANDROID_RELEASE_CONFIG:/etc/android-release.json") \
               spark-builder

    # unpack new builds to appropriate locations
    mv docker-builds/spark-wallet-*-npm.tgz .
    mv -f docker-builds/npm-unpacked dist
    mv -f docker-builds/electron electron/dist
    mv -f docker-builds/cordova-android-debug cordova/platforms/android/app/build/outputs/apk/debug
    mv -f docker-builds/cordova-android-release cordova/platforms/android/app/build/outputs/apk/release
  else
    npm run dist:npm -- --pack-tgz
    npm run dist:electron -- --linux --mac # building windows require wine (only done in docker)
    npm run dist:cordova
    [ -n "$ANDROID_RELEASE_CONFIG" ] && BUILD_TYPE=release npm run dist:cordova -- --buildConfig $ANDROID_RELEASE_CONFIG
  fi
fi

# Build Docker server image
if [[ -z "$SKIP_DOCKER" ]]; then

  # Building the arm32v7 image requires registering qemu on the host, which can be done using one of the following:
  # sudo apt-get install qemu binfmt-support qemu-user-static
  # docker run --rm --privileged multiarch/qemu-user-static:register --reset

  docker build -t $docker_name:$version-amd64 .
  docker build -t $docker_name:$version-standalone-amd64 --build-arg STANDALONE=1 .
  docker build -t $docker_name:$version-standalone-arm32v7 -f arm32v7.Dockerfile .
  docker build -t $docker_name:$version-standalone-arm64v8 -f arm64v8.Dockerfile .

  # Need to push architecture specific images to make the manifest
  docker push $docker_name:$version-standalone-amd64
  docker push $docker_name:$version-standalone-arm32v7
  docker push $docker_name:$version-standalone-arm64v8

  # Required for `docker manifest` (as of docker v19.03.3)
  export DOCKER_CLI_EXPERIMENTAL=enabled

  # Tagging a manifest does not work, so we need to create a manifest list for both tags
  for target in "$docker_name:$version-standalone" "$docker_name:standalone"
  do
  # We need to create the multi arch image for -standalone
  # Make sure experimental docker cli feature is on: echo "{ \"experimental\": \"enabled\" }" >> $HOME/.docker/config.json
  docker manifest create --amend $target $docker_name:$version-standalone-amd64 $docker_name:$version-standalone-arm32v7 $docker_name:$version-standalone-arm64v8
  docker manifest annotate $target $docker_name:$version-standalone-amd64 --os linux --arch amd64
  docker manifest annotate $target $docker_name:$version-standalone-arm32v7 --os linux --arch arm --variant v7
  docker manifest annotate $target $docker_name:$version-standalone-arm64v8 --os linux --arch arm64 --variant v8
  docker manifest push $target -p
  done

  # Need to push image to get its checksum in dist-shasums below. See https://groups.google.com/forum/#!topic/docker-user/PvAcxDrvP30
  # https://github.com/moby/moby/issues/16482 https://github.com/docker/distribution/issues/1662
  docker push $docker_name:$version-amd64

  docker tag $docker_name:$version-standalone-arm32v7 $docker_name:standalone-arm32v7
  docker push $docker_name:standalone-arm32v7
  docker tag $docker_name:$version-standalone-arm64v8 $docker_name:standalone-arm64v8
  docker push $docker_name:standalone-arm64v8
  docker tag $docker_name:$version-standalone-amd64 $docker_name:standalone-amd64
  docker push $docker_name:standalone-amd64
  docker tag $docker_name:$version-amd64 $docker_name:$version
  docker push $docker_name:$version
  docker tag $docker_name:$version-amd64 $docker_name:latest
  docker push $docker_name:latest
fi

# Make SHA256SUMS & sign it
if [[ -z "$SKIP_SHASUM" ]]; then
  ./scripts/dist-shasums.sh | gpg --clearsign --digest-algo sha256 > SHA256SUMS.asc
fi

# Tag version & sign it
if [[ -z "$SKIP_TAG" ]]; then
  git add package.json npm-shrinkwrap.json SHA256SUMS.asc CHANGELOG.md

  git commit -m v$version
  git tag --sign -m "$changelog" v$version
  git branch -f stable HEAD
  git push gh master stable && git push gh --tags
fi

# Publish release to npm
if [[ -z "$SKIP_NPM" ]]; then
  npm publish --tag ${NPM_TAG:-latest} --ignore-scripts # ignore prepublish script, we don't need to build again
fi

# Upload dist files to GitHub releases
if [[ -z "$SKIP_UPLOAD" && -n "$GH_TOKEN" ]]; then
  gh_auth="Authorization: token $GH_TOKEN"
  gh_base=https://api.github.com/repos/$gh_repo
  release_opt=`jq -n --arg version v$version --arg changelog "$changelog" \
    '{ tag_name: $version, name: $version, body: $changelog, draft:true }'`
  gh_release=`curl -sf -H "$gh_auth" $gh_base/releases/tags/v$version \
           || curl -sf -H "$gh_auth" -d "$release_opt" $gh_base/releases`
  gh_upload=`echo "$gh_release" | jq -r .upload_url | sed -e 's/{?name,label}//'`

  for file in SHA256SUMS.asc \
              spark-wallet-*-npm.tgz \
              electron/dist/*.{AppImage,deb,snap,tar.gz,exe,zip} \
              cordova/platforms/android/app/build/outputs/apk/{debug,release}/*.apk; do
    echo ">> Uploading $file"

    curl -f --progress-bar -H "$gh_auth" -H "Content-Type: application/octet-stream" \
         --data-binary @"$file" "$gh_upload?name=$(basename $file)" | (grep -v browser_download_url || true)
  done

  # make release public once everything is ready
  curl -sf -H "$gh_auth" -X PATCH $gh_base/releases/`echo "$gh_release" | jq -r .id` \
    -d '{"draft":false}' > /dev/null
fi
