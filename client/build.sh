#!/usr/bin/env bash
set -xeo pipefail
shopt -s extglob

: ${DEST:=dist}
: ${NODE_ENV:=production}
: ${BUILD_TARGET:=web}

export BUILD_TARGET
export NODE_ENV
export VERSION=`node -p 'require("../package").version'`
export LPK=`openssl ecparam -genkey -name secp256k1 -text -noout -outform DER | xxd -p -c 1000 | sed 's/41534e31204f49443a20736563703235366b310a30740201010420//' | sed 's/a00706052b8104000aa144034200/\'$'\nPubKey: /' | sed '2d'`

rm -rf $DEST/*
mkdir -p $DEST $DEST/lib $DEST/fonts $DEST/swatch

[[ -d node_modules ]] || NODE_ENV=development npm install

# Static assets
cp -r www/* $DEST/
cp -r fonts/node_modules/typeface-* $DEST/fonts/
cp -r node_modules/bootswatch/dist/!(darkly|litera|minty|sketchy|journal|pulse) $DEST/swatch/
cp -r swatch/*/ $DEST/swatch/
find $DEST/swatch -type f ! -name '*.min.css' -delete
find $DEST/fonts -type f -name "*.md" -delete
find $DEST/fonts -type f -name "*.json" -delete

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

if [[ "$BUILD_TARGET" == "web" ]]; then
  stylus -u nib -c styl/noscript.styl -o $DEST
fi

# Browserify bundles

bundle() {
  browserify $BROWSERIFY_OPT $1 \
    | ( [[ "$NODE_ENV" != "development" ]] && terser --compress warnings=false --mangle || cat )
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
  bundle src/websocket.js > $DEST/websocket.js
  pug -O '{"bundle":"websocket.js"}' < index.pug > $DEST/websocket.html
  pug -O '{"bundle":"settings.js"}' < index.pug > $DEST/settings.html
fi
