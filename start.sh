#!/bin/bash
export NODE_ENV=development
export VERBOSE=1

[ -f .env ] && source .env

babel-node src/cli.js $@
