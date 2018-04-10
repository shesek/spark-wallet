#!/bin/bash
export NODE_ENV=development
[ -f .env ] && source .env
babel-node src/cli.js $@
