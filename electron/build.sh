#!/bin/bash
set -xeo pipefail
shopt -s expand_aliases

[[ -d node_modules ]] || npm install

# use faketime (if available) to make reproducible electron builds (works for deb, snap, tar.gz and zip, but not for AppImage)
command -v faketime && alias electron-builder="TZ=UTC faketime -f '2017-11-08 16:58:41' electron-builder"

# Build UI assets
if [[ -z "$SKIP_CLIENT" ]]; then
  export BUILD_TARGET=electron
  export DEST=`pwd`/www
  export BROWSERIFY_OPT='--insert-global-vars __filename,__dirname,global,process,Buffer'

  mkdir -p $DEST && rm -rf $DEST/*

  (cd ../client && npm run dist)
  touch $DEST/blank.html
fi

# Build server bundle
# TLS, Onion, QR and Web UI are not needed by Electron builds and removed to reduce bundle size.
# Must be used with NO_TLS+NO_WEBUI and without ONION/PRINT_QR
if [[ -z "$SKIP_SERVER" ]]; then
  browserify --node -t babelify -t [ browserify-package-json --only version  ] \
             -p bundle-collapser/plugin \
             -x ../src/webui.js -x ../src/transport/tls.js -x ../src/transport/onion.js -x qrcode-terminal -x http2 \
             ../node_modules/@babel/polyfill \
             ../src/app.js \
  | ( [[ "$NODE_ENV" != "development" ]] && terser --compress warnings=false --mangle || cat ) \
  > server.bundle.js
fi

# Build electron package
if [[ -z "$SKIP_PACKAGE" ]]; then
  electron-builder "$@" -c.extraMetadata.version=`node -p 'require("../package").version'`
   # when faketime is used, correct the timestamp for the final dist files (it does not effect their hash)
   command -v faketime && touch dist/*
fi
