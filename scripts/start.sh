#!/bin/bash
set -eo pipefail

export NODE_ENV=development
export VERBOSE=1

[ ! -d client/node_modules ] && (cd client && npm install)

[ -f .env ] && source .env

npx babel-node src/cli.js "$@"
