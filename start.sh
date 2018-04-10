#!/bin/bash
[ -f .env ] && source .env
babel-node src/app.js
