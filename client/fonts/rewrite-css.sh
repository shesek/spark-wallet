#!/bin/sh

# Rewrite @import statements in CSS themes to use local fonts,
# instead of loading them from Google.

perl -i -pe '
s/\@import url\("https:\/\/fonts\.googleapis\.com\/css\?family=([^"]+)"\);/
join "", map {
  s\/:.*\/\/; s\/\+\/-\/g;
  "\@import url(..\/..\/fonts\/typeface-".lc($_)."\/index.css);"
} split "\\|", $1
/ge' $@
