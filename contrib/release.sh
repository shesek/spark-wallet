#!/bin/bash
set -xeo pipefail

gh_repo=elementsproject/spark
sdir="${BASH_SOURCE%/*}"
docker_name=shesek/spark

[ -z "$1" ] && { echo >&2 "version bump argument required, e.g. $0 patch"; exit 1; }

# Bump version
npm version --no-git-tag-version --allow-same-version $1
version=`node -p 'require("./package").version'`

# Extract unreleased changelog & update version number
changelog="`sed -nr '/^## (Unreleased|'$version' )/{n;:a;n;/^## /q;p;ba}' CHANGELOG.md`"
sed -i "s/^## Unreleased/## $version - `date +%Y-%m-%d`/" CHANGELOG.md

echo -e "Building Spark v$version\n\n$changelog\n\n"

# Build NPM, Electron and Cordova dist files
if [[ -z "$SKIP_BUILD" ]]; then
  # clean up previous builds
  rm -rf docker-builds spark-wallet-*-npm.tgz dist electron/dist

  # Build NPM package and Electron builds inside the builder Docker (for reproducibility)
  if [[ -z "$NO_DOCKER_BUILDER" ]]; then
    docker build -f contrib/builder.Dockerfile -t spark-builder .
    docker run -it --rm -v `pwd`/docker-builds:/target -e OWNER=`id -u`:`id -g` spark-builder
    # unpack new builds to appropriate locations
    mv docker-builds/spark-wallet-*-npm.tgz .
    mv -f docker-builds/npm-unpacked dist
    mv -f docker-builds/electron electron/dist
  else
    npm run dist:npm -- --pack-tgz
    npm run dist:electron -- --linux --mac # windows build require wine and is therefore only built inside docker
  fi

  # Cordova is not reproducible and is built outside of Docker
  npm run dist:cordova -- --release
fi

# Build Docker server image
if [[ -z "$SKIP_DOCKER" ]]; then
  docker build -t $docker_name:$version .
  docker tag $docker_name:$version $docker_name:latest
  # we shouldn't push docker this early in the script, but the docker image hash is not available until we do
  # and is needed for the SHA256SUMS file. https://groups.google.com/forum/#!topic/docker-user/PvAcxDrvP30
  # https://github.com/moby/moby/issues/16482 https://github.com/docker/distribution/issues/1662
  docker push $docker_name
fi

# Make SHA256SUMS & sign it
if [[ -z "$SKIP_SHASUM" ]]; then
  $sdir/dist-shasums.sh | gpg --clearsign --digest-algo sha256 > SHA256SUMS.asc
fi

# Tag version & sign it
if [[ -z "$SKIP_TAG" ]]; then
  git add package.json npm-shrinkwrap.json cordova/config.xml SHA256SUMS.asc CHANGELOG.md

  git commit -m v$version
  git tag --sign -m "$changelog" v$version
  git push && git push --tags
fi

# Publish release to npm
if [[ -z "$SKIP_NPM" ]]; then
  npm publish --ignore-scripts # ignore prepublish script, we don't need to build again
fi

# Upload dist files to GitHub releases
if [[ -z "$SKIP_UPLOAD" ]]; then
  gh_auth="Authorization: token $GH_TOKEN"
  gh_base=https://api.github.com/repos/$gh_repo
  gh_release=`curl -sf -H "$gh_auth" $gh_base/releases/tags/v$version \
           || curl -sf -H "$gh_auth" -d '{"tag_name":"'v$version'","prerelease":true}' $gh_base/releases`
  gh_upload=`echo "$gh_release" | jq -r .upload_url | sed -e 's/{?name,label}//'`

  for file in SHA256SUMS.asc \
              spark-wallet-*-npm.tgz \
              electron/dist/*.{AppImage,deb,snap,tar.gz,exe,zip} \
              cordova/platforms/android/app/build/outputs/apk/release/*.apk; do
    echo ">> Uploading $file"

    curl -f --progress-bar -H "$gh_auth" -H "Content-Type: application/octet-stream" \
         --data-binary @"$file" "$gh_upload?name=$(basename $file)" | (grep -v browser_download_url || true)
  done
fi
