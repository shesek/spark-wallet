#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ nanopay [options]

    Options
      -l, --ln-path <path>    path to c-lightning data directory [default: ~/.lightning]
      -p, --port <port>       http server port [default: 9115]
      -i, --host <host>       http server listen address [default: 127.0.0.1]

      --no-webui              run API server without serving client assets

      -h, --help              output usage information
      -v, --version           output version number

    Example
      $ nanopay -l ~/.lightning

`, { flags: { lnPath: {alias:'l'}, port: {alias:'p'}, host: {alias:'i'} } }
).flags

Object.keys(args).filter(k => k.length > 1)
  .forEach(k => process.env[k.replace(/([A-Z])/g, '_$1').toUpperCase()] = args[k])

process.env.NODE_ENV || (process.env.NODE_ENV = 'production')

require('babel-polyfill')
require('./app')
