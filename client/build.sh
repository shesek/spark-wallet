#!/bin/bash
set -xeo pipefail

: ${DEST:=dist}
: ${NODE_ENV=production}
: ${BUILD_TARGET:=web}

export BUILD_TARGET
export NODE_ENV

rm -rf $DEST/*
mkdir -p $DEST $DEST/lib

[[ -d node_modules ]] || npm install

# Copy static assets
cp -r www/* $DEST/
cp -r node_modules/bootswatch/dist $DEST/swatch
cp -r swatch/*/ $DEST/swatch/
find $DEST/swatch -type f ! -name '*.min.css' -exec rm {} +

if [[ "$BUILD_TARGET" == "web" ]]; then
  cp node_modules/instascan/dist/instascan.min.js $DEST/lib/instascan.js
fi

# Transpile pug and stylus
pug index.pug -o $DEST
stylus -u nib -c styl/style.styl -o $DEST

# Browserify bundle
browserify src/app.js \
  | ( [[ "$NODE_ENV" != "development" ]] && uglifyjs -c warnings=false -m || cat ) \
  > $DEST/app.js

