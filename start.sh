#!/bin/bash
[ -f .env ] && source .env
babel-node src/cli.js $@
