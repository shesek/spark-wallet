#!/bin/bash
set -xeo pipefail

mkdir -p dist
rm -rf dist/*

babel -d dist src

(cd client && DEST=../dist/www npm run dist)
