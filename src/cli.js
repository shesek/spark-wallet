#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ spark [options]

    Options
      -l, --ln-path <path>    path to c-lightning data directory [default: ~/.lightning]
      -u, --login <userpwd>   http basic auth login, "username:password" format [default: generate random]

      -p, --port <port>       http(s) server port [default: 9737]
      -i, --host <host>       http(s) server listen address [default: 127.0.0.1]

      -s, --tls-path <path>   directory to read/store key.pem and cert.pem for TLS [default: ./spark-tls/]
      --tls-name <name>       common name for the generated self-signed cert [default: {host}]
      --no-tls                disable TLS, start plain HTTP server instead [default: false]

      -o, --onion             start Tor Hidden Service [default: false]
      -O, --onion-path <path> directory to read/store hidden service data [default: ./spark-tor/]

      -Q, --print-qr          print QR code with the server URL [default: false]
      --qr-with-cred          print QR code with embedded login credentials [default: false]
      --no-webui              run API server without serving client assets [default: false]

      -V, --verbose           display debugging information [default: false]
      -h, --help              output usage information
      -v, --version           output version number

    Example
      $ spark -l ~/.lightning

`, { flags: { lnPath: {alias:'l'}, login: {alias:'u'}
            , port: {alias:'p'}, host: {alias:'i'}, tlsPath: {alias:'s'}
            , onion: {type:'boolean',alias:'o'}, onionPath: {alias:'O'}
            , printQr: {type:'boolean', alias:'Q'}, qrWithCred: {type:'boolean'}
            , verbose: {alias:'V', type:'boolean'}
} }).flags

const keys = Object.keys(args).filter(k => k.length > 1)
keys.filter(k => args[k] !== false).forEach(k => process.env[k.replace(/([A-Z])/g, '_$1').toUpperCase()] = args[k])
keys.filter(k => args[k] === false).forEach(k => process.env['NO_' + k.replace(/([A-Z])/g, '_$1').toUpperCase()] = true)

process.env.NODE_ENV || (process.env.NODE_ENV = 'production')
process.env.VERBOSE && (process.env.DEBUG = `lightning-client,spark,${process.env.DEBUG||''}`)
process.env.ONION_PATH && (process.env.ONION = true) // --onion-path implies --onion
process.env.QR_WITH_CRED && (process.env.PRINT_QR = true) // --qr-with-cred implies --print-qr

// https://medium.com/@lmakarov/say-goodbye-to-urls-with-embedded-credentials-b051f6c7b6a3
if (process.env.QR_WITH_CRED) console.error(`
  The QR below contains a URL with embedded credentials (--qr-with-cred).
  Note that URLs with embedded credentials are being deprecated in modern browsers.
  In particular, Chrome mobile will appear to work but break in subtle ways.
  The QR is meant to be scanned by the Spark mobile app. To authenticate from a browser, login manually.
`)

require('babel-polyfill')
require('./app')
