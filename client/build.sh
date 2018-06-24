#!/bin/bash
set -xeo pipefail

: ${DEST:=dist}
: ${NODE_ENV=production}
: ${BUILD_TARGET:=web}

export BUILD_TARGET
export NODE_ENV

rm -rf $DEST/*
mkdir -p $DEST $DEST/lib $DEST/fonts

[[ -d node_modules ]] || npm install
[[ -d fonts/node_modules ]] || (cd fonts && npm install)

# Static assets
cp -r www/* $DEST/
cp -r fonts/node_modules/typeface-* $DEST/fonts/
cp -r node_modules/bootswatch/dist $DEST/swatch
cp -r swatch/*/ $DEST/swatch/
find $DEST/swatch -type f ! -name '*.min.css' -delete
find $DEST/fonts -type f -regex '.*\.\(md\|json\)' -delete
./fonts/rewrite-css.sh $DEST/swatch/*/*.css

if [[ "$BUILD_TARGET" == "web" ]]; then
  cp node_modules/instascan/dist/instascan.min.js $DEST/lib/instascan.js
else
  rm -r $DEST/manifest
fi

# Transpile pug and stylus
pug index.pug -o $DEST
stylus -u nib -c styl/style.styl -o $DEST

# Browserify bundles

bundle() {
  browserify $1 \
    | ( [[ "$NODE_ENV" != "development" ]] && uglifyjs -c warnings=false -m || cat )
}

# Primary wallet application bundle
bundle src/app.js > $DEST/app.js

# Settings page for Cordova
if [[ "$BUILD_TARGET" == "cordova" ]]; then
  bundle src/cordova-settings.js > $DEST/settings.js
  pug -O '{"bundle":"settings.js"}' < index.pug > $DEST/settings.html
fi
