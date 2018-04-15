#!/bin/bash
set -xeo pipefail

: ${DEST:=dist}
: ${BUILD_TARGET:=web}

export BUILD_TARGET

rm -rf $DEST/*
mkdir -p $DEST $DEST/lib

[[ -d node_modules ]] || npm install

# Copy static assets
cp -r www/* $DEST/
cp -r node_modules/instascan/dist/instascan.min.js $DEST/lib/instascan.js
cp -r node_modules/bootswatch/dist $DEST/bootswatch
find $DEST/bootswatch -type f ! -name '*.min.css' -exec rm {} +

# Transpile pug and stylus
pug index.pug -o $DEST
stylus -u nib -c styl/style.styl -o $DEST

# Browserify bundle
browserify src/app.js | uglifyjs -c warnings=false -m > $DEST/app.js

