#!/bin/bash
set -xeo pipefail
shopt -s extglob

: ${DEST:=dist}
: ${NODE_ENV:=production}
: ${BUILD_TARGET:=web}

export BUILD_TARGET
export NODE_ENV
export VERSION=`node -p 'require("../package").version'`-`git describe --always --abbrev=7`

rm -rf $DEST/*
mkdir -p $DEST $DEST/lib $DEST/fonts $DEST/swatch

[[ -d node_modules ]] || npm install
[[ -d fonts/node_modules ]] || (cd fonts && npm install)

# Static assets
cp -r www/* $DEST/
cp -r fonts/node_modules/typeface-* $DEST/fonts/
cp -r node_modules/bootswatch/dist/!(darkly|litera|minty|sketchy|journal|pulse) $DEST/swatch/
cp -r swatch/*/ $DEST/swatch/
find $DEST/swatch -type f ! -name '*.min.css' -delete
find $DEST/fonts -type f -regex '.*\.\(md\|json\)' -delete
./fonts/rewrite-css.sh $DEST/swatch/*/*.css

if [[ "$BUILD_TARGET" == "web" ]] || [[ "$BUILD_TARGET" == "electron" ]]; then
  cp node_modules/instascan/dist/instascan.min.js $DEST/lib/instascan.js
fi

if [[ "$BUILD_TARGET" != "web" ]]; then
  rm -r $DEST/manifest
fi

# Transpile pug and stylus
pug index.pug -o $DEST
stylus -u nib -c styl/style.styl -o $DEST

# Browserify bundles

bundle() {
  browserify $BROWSERIFY_OPT $1 \
    | ( [[ "$NODE_ENV" != "development" ]] && uglifyjs -c warnings=false -m || cat )
}

# Primary wallet application bundle
bundle src/app.js > $DEST/app.js

# Theme loader
bundle src/load-theme.js > $DEST/load-theme.js

# Service worker
if [[ "$BUILD_TARGET" == "web" ]]; then
  bundle src/worker.js > $DEST/worker.js
fi

# Settings page for Cordova/Electron
if [[ "$BUILD_TARGET" == "cordova" ]] || [[ "$BUILD_TARGET" == "electron" ]]; then
  bundle src/server-settings.js > $DEST/settings.js
  pug -O '{"bundle":"settings.js"}' < index.pug > $DEST/settings.html
fi
