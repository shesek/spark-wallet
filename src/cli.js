#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ spark-wallet [options]

    Options
      -l, --ln-path <path>    path to c-lightning data directory [default: ~/.lightning]
      -u, --login <userpwd>   http basic auth login, "username:password" format [default: generate random]

      -p, --port <port>       http(s) server port [default: 9737]
      -i, --host <host>       http(s) server listen address [default: localhost]

      -s, --tls-path <path>   directory to read/store key.pem and cert.pem for TLS [default: ./spark-tls/]
      --tls-name <name>       common name for the generated self-signed cert [default: {host}]
      --force-tls             enable TLS even when binding on localhost [default: enable for non-localhost only]
      --no-tls                disable TLS for non-localhost hosts [default: false]

      -o, --onion             start Tor Hidden Service [default: false]
      -O, --onion-path <path> directory to read/store hidden service data [default: ./spark-tor/]

      -k, --print-key         print access key to console (for use with the Cordova/Electron apps) [default: false]
      -Q, --print-qr          print QR code with the server URL [default: false]
      --qr-with-key           print QR code with embedded access key [default: false]
      --no-webui              run API server without serving client assets [default: false]

      -V, --verbose           display debugging information [default: false]
      -h, --help              output usage information
      -v, --version           output version number

    Example
      $ spark-wallet -l ~/.lightning

    All options may also be specified as environment variables:
      $ LN_PATH=/data/lightning PORT=8070 NO_TLS=1 spark-wallet

`, { flags: { lnPath: {alias:'l'}, login: {alias:'u'}
            , port: {alias:'p'}, host: {alias:'i'}, tlsPath: {alias:'s'}
            , onion: {type:'boolean',alias:'o'}, onionPath: {alias:'O'}
            , printKey: {type:'boolean', alias:'k'}, printQr: {type:'boolean', alias:'Q'}, qrWithKey: {type:'boolean'}
            , verbose: {alias:'V', type:'boolean'}
} }).flags

Object.keys(args).filter(k => k.length > 1)
  .map(k => [ k.replace(/([A-Z])/g, '_$1').toUpperCase(), args[k] ])
  .forEach(([ k, v ]) => v !== false ? process.env[k] = v
                                     : process.env[`NO_${k}`] = true)

process.env.NODE_ENV || (process.env.NODE_ENV = 'production')
process.env.VERBOSE && (process.env.DEBUG = `lightning-client,spark,${process.env.DEBUG||''}`)
process.env.ONION_PATH && (process.env.ONION = true) // --onion-path implies --onion
process.env.QR_WITH_KEY && (process.env.PRINT_QR = true) // --qr-with-key implies --print-qr

require('babel-polyfill')
require('./app')
