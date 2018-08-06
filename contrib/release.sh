#!/bin/bash
set -xeo pipefail

gh_repo=elementsproject/spark
sdir="${BASH_SOURCE%/*}"

[ -z "$1" ] && { echo >&2 "version bump argument required, e.g. $0 patch"; exit 1; }

# Bump version
npm version --no-git-tag-version --allow-same-version $1
version=`node -p 'require("./package").version'`

# Build dist files
if [[ -z "$SKIP_BUILD" ]]; then
  npm run dist:all
fi

# Make SHA256SUMS & sign it
if [[ -z "$SKIP_SHASUM" ]]; then
  $sdir/dist-shasums.sh | gpg --clearsign --digest-algo sha256 > SHA256SUMS.asc
fi

# Tag version & sign it
if [[ -z "$SKIP_TAG" ]]; then
  # extract unreleased changelog & update version number
  changelog="`sed -n '/^## Unreleased/{n;:a;n;/^## /q;p;ba}' CHANGELOG.md`"
  sed -i "s/^## Unreleased/## $version - `date +%Y-%m-%d`/" CHANGELOG.md

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
