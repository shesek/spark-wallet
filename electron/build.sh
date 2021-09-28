#!/bin/bash
set -xeo pipefail
shopt -s expand_aliases

[[ -d node_modules ]] || npm install

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

# Use faketime (if available) to make reproducible electron builds (works for all builds except deb and the Windows portable runner)
: ${LIBFAKETIME:=/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1}
if [ -f "$LIBFAKETIME" ]; then
  # Set a start timestamp and make the clock move *very* slowly. The build
  # should finish in under 1 second with this speed.
  export LD_PRELOAD=$LIBFAKETIME FAKETIME="@2017-11-08 16:58:41 x0.0000001"
fi

# Build electron package
if [[ -z "$SKIP_PACKAGE" ]]; then
  electron-builder "$@" -c.extraMetadata.version=`node -p 'require("../package").version'`
   # correct the timestamp for the final dist files (needed when faketime is used)
   touch dist/*
fi

[ -n "$FAKETIME" ] && unset FAKETIME