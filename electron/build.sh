#!/bin/bash
set -xeo pipefail

[[ -d node_modules ]] || npm install

# Build UI assets
if [[ -z "$SKIP_CLIENT" ]]; then
  export BUILD_TARGET=electron
  export DEST=`pwd`/www
  export BROWSERIFY_OPT='--insert-global-vars __filename,__dirname,global'

  mkdir -p $DEST && rm -rf $DEST/*

  (cd ../client && npm run dist)
  touch $DEST/blank.html
fi

# Build server bundle
# TLS, Onion, QR and Web UI are not needed by Electron builds and removed to reduce bundle size.
# Must be used with NO_TLS+NO_WEBUI and without ONION/PRINT_QR
if [[ -z "$SKIP_SERVER" ]]; then
  browserify --node -t babelify \
             -x selfsigned -x qrcode-terminal -x hsv3 -x ../src/webui.js \
             ../node_modules/babel-polyfill \
             ../src/app.js \
  | ( [[ "$NODE_ENV" != "development" ]] && uglifyjs --compress --mangle || cat ) \
  > server.bundle.js
fi

# Build electron package
if [[ -z "$SKIP_PACKAGE" ]]; then
  electron-builder "$@" -c.extraMetadata.version=`node -p 'require("../package").version'`
fi
