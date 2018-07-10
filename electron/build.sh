#!/bin/bash
set -xeo pipefail

mkdir -p www
rm -rf www/*

[[ -d node_modules ]] || npm install

export BUILD_TARGET=electron
export DEST=`pwd`/www
export BROWSERIFY_OPT='--ignore-missing --no-builtins --insert-global-vars __filename,__dirname'

# --ignore-missing lets require('electron') pass to the bundle as-is (required for accessing the ipcRenderer)
# --no-builtins is used because electron runs the bundle in an environment with all the nodejs apis

[[ -n "$SKIP_CLIENT_DIST" ]] || (cd ../client && npm run dist)

electron-builder -c.extraMetadata.name=spark \
                 -c.extraMetadata.version=`node -p 'require("../package").version'` \
                 "$@"
