#!/bin/bash

# Download fonts via https://github.com/KyleAMathews/typefaces

./list-fonts.sh | while read font; do
  pkg=typeface-$font
  if [[ "`npm owner ls $pkg`" == "kylemathews <mathews.kyle@gmail.com>" ]]; then
    npm install typeface-$font@latest
  else
    echo "[ERR] $pkg has unexpected owner"
  fi
done
