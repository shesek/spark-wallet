#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ spark [options]

    Options
      -l, --ln-path <path>    path to c-lightning data directory [default: ~/.lightning]
      -u, --login <userpwd>   http basic auth login, "username:password" format [default: generate random]

      -p, --port <port>       http(s) server port [default: 9117]
      -i, --host <host>       http(s) server listen address [default: 127.0.0.1]

      -s, --tls-path <path>   directory to read/store key.pem and cert.pem for TLS [default: ./spark-tls/]
      --tls-name <name>       common name for the generated self-signed cert [default: {host}]
      --no-tls                disable TLS, start plain HTTP server instead [default: false]

      -o, --onion             start Tor Hidden Service [default: false]
      -O, --onion-path <path> directory to read/store hidden service data [default: ./spark-tor/]

      -Q, --print-qr          print QR codes for server access, including password [default: false]
      --no-webui              run API server without serving client assets [default: false]

      -V, --verbose           display debugging information [default: false]
      -h, --help              output usage information
      -v, --version           output version number

    Example
      $ spark -l ~/.lightning

`, { flags: { lnPath: {alias:'l'}, login: {alias:'u'}
            , port: {alias:'p'}, host: {alias:'i'}, tlsPath: {alias:'s'}
            , onion: {type:'boolean',alias:'o'}, onionPath: {alias:'O'}
            , printQr: {type:'boolean', alias:'Q'}
            , verbose: {alias:'V', type:'boolean'}
} }).flags

const keys = Object.keys(args).filter(k => k.length > 1)
keys.filter(k => args[k] !== false).forEach(k => process.env[k.replace(/([A-Z])/g, '_$1').toUpperCase()] = args[k])
keys.filter(k => args[k] === false).forEach(k => process.env['NO_' + k.replace(/([A-Z])/g, '_$1').toUpperCase()] = true)

process.env.NODE_ENV   || (process.env.NODE_ENV = 'production')
process.env.VERBOSE    && (process.env.DEBUG = `lightning-client,spark,${process.env.DEBUG||''}`)
process.env.ONION_PATH && (process.env.ONION = true) // --onion-path implies --onion

require('babel-polyfill')
require('./app')
