#!/bin/bash
DEST=cordova-app/www
rm -r $DEST/*

export TARGET_CORDOVA=1
cp -rL www $DEST/assets
pug index.pug -o $DEST
browserify client/app.js > $DEST/app.js
stylus -u nib styl/style.styl $DEST/assets

