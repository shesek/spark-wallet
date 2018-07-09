#!/bin/bash
set -xeo pipefail

mkdir -p www
rm -rf www/*

export BUILD_TARGET=electron
(cd ../client && DEST=../electron/www npm run dist)

