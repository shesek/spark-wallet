#!/bin/bash
DEST=cordova-app/www

rm -r $DEST/*

cp -rL www $DEST/assets
find $DEST/assets/bootswatch -type f ! -name '*.min.css' -exec rm {} +

export BUILD_TARGET='cordova'

pug index.pug -o $DEST
browserify client/app.js | uglifyjs -c warnings=false -m > $DEST/app.js
stylus -u nib styl/style.styl $DEST/assets

