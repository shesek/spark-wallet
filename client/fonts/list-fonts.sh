#!/bin/bash

# Extract the list of web fonts used by all the themes

cat ../node_modules/bootswatch/dist/*/*.scss | grep 'web-font-path:' |
  cut -d= -f2 | cut -d'"' -f1 | # extract "family" arg"
  tr '|' '\n' | cut -d: -f1 | # split multiple fonts, remove sub-styles
  sort -u | # drop dups
  tr '+' '-' | tr '[:upper:]' '[:lower:]' | # normalize to package-style names
  sed 's/[^a-z0-9-]//g' # remove unexpected characters, so we don't get anything funny

