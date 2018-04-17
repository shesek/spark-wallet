#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ nanopay [options]

    Options
      -l, --ln-path <path>    path to c-lightning data directory [default: ~/.lightning]
      -u, --login <userpwd>   http basic auth login, "username:password" format [default: generate random]

      -p, --port <port>       http server port [default: 9115]
      -i, --host <host>       http server listen address [default: 127.0.0.1]
      -s, --ssl-path <path>   path to read/store SSL key material [default: ./nanopay-ssl.json]
      -o, --onion             start Tor Hidden Service [default: false]
      -O, --onion-dir <path>  path to create/read hidden service data directory [default: ./nanopay-tor]

      -Q, --print-qr          print QR codes for server access [default: false]
      --no-webui              run API server without serving client assets [default: false]

      -h, --help              output usage information
      -v, --version           output version number

    Example
      $ nanopay -l ~/.lightning

`, { flags: { lnPath: {alias:'l'}, login: {alias:'u'}
            , port: {alias:'p'}, host: {alias:'i'}, sslPath: {alias:'s'}
            , onion: {type:'boolean',alias:'o'}, onionDir: {alias:'O'}
            , printQr: {type:'boolean'}, noWebui: {type:'boolean'}
} }).flags

Object.keys(args).filter(k => k.length > 1)
  .forEach(k => process.env[k.replace(/([A-Z])/g, '_$1').toUpperCase()] = args[k])

process.env.NODE_ENV || (process.env.NODE_ENV = 'production')

require('babel-polyfill')
require('./app')
