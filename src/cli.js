#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ spark-wallet [options]

    Options
      -l, --ln-path <path>     path to c-lightning data directory [default: ~/.lightning]
      -p, --port <port>        http(s) server port [default: 9737]
      -i, --host <host>        http(s) server listen address [default: localhost]
      -u, --login <userpwd>    http basic auth login, "username:password" format [default: generate random]
      -C, --cookie-file <path> persist generated login credentials to <path> or load them [default: ~/.spark-wallet/cookie]
      --no-cookie-file         disable cookie file [default: false]

      --force-tls              enable TLS even when binding on localhost [default: enable for non-localhost only]
      --no-tls                 disable TLS for non-localhost hosts [default: false]
      --tls-path <path>        directory to read/store key.pem and cert.pem for TLS [default: ~/.spark-wallet/tls/]
      --tls-name <name>        common name for the TLS cert [default: {host}]

      --letsencrypt <email>    enable CA-signed certificate via LetsEncrypt [default: false]
      --le-port <port>         port to bind LetsEncrypt verification server [default: 80]
      --le-noverify            skip starting the LetsEncrypt verification server [default: start when {letsencrypt} is set]
      --le-debug               display additional debug information for LetsEncrypt [default: false]

      -o, --onion              start Tor Hidden Service (v3) [default: false]
      -O, --onion-path <path>  directory to read/store hidden service data [default: ~/.spark-wallet/tor/]

      -k, --print-key          print access key to console (for use with the Cordova/Electron apps) [default: false]
      -q, --print-qr           print QR code with the server URL [default: false]
      -Q, --pairing-qr         print QR code with embedded access key [default: false]
      -P, --pairing-url        print URL with embedded access key [default: false]
      --public-url <url>       override public URL used for QR codes [default: http(s)://{host}/]

      --no-webui               run API server without serving client assets [default: false]
      --no-test-conn           skip testing access to c-lightning rpc (useful for init scripts) [default: false]

      -c, --config <path>      path to config file [default: ~/.spark-wallet/config]
      -V, --verbose            display debugging information [default: false]
      -h, --help               output usage information
      -v, --version            output version number

    Example
      $ spark-wallet -l ~/.lightning

    All options may also be specified as environment variables:
      $ LN_PATH=/data/lightning PORT=8070 NO_TLS=1 spark-wallet

`, { flags: { lnPath: {alias:'l'}, login: {alias:'u'}, cookieFile: {alias:'C'}
            , port: {alias:'p'}, host: {alias:'i'}
            , leNoverify: {type:'boolean'}, leDebug: {type:'boolean'}
            , printKey: {type:'boolean', alias:'k'}, printQr: {type:'boolean', alias:'q'}
            , pairingQr: {type:'boolean', alias:'Q'}, pairingUrl: {type:'boolean', alias:'P'}
            , onion: {type:'boolean',alias:'o'}, onionPath: {alias:'O'}
            , config: {alias:'c'}, verbose: {alias:'V', type:'boolean'}
} }).flags

// Load config file
const os = require('os'), fs = require('fs'), path = require('path'), ini = require('ini')
    , confPath = args.config || process.env.CONFIG || path.join(os.homedir(), '.spark-wallet', 'config')
    , fileConf = fs.existsSync(confPath) ? ini.parse(fs.readFileSync(confPath, 'utf-8')) : {}

const conf = Object.assign({}, fileConf, args)

// Set config options from argv and file as environment variables
Object.keys(conf).filter(k => k.length > 1)
  .map(k => [ k.replace(/([^A-Z_])([A-Z])/g, '$1_$2').replace(/-/g, '_').toUpperCase(), conf[k] ])
  .forEach(([ k, v ]) => v !== false ? process.env[k] = v
                                     : process.env[`NO_${k}`] = true)

// Enable cookie file by default in the same dir as the config file
if (!process.env.NO_COOKIE_FILE && !process.env.COOKIE_FILE)
  process.env.COOKIE_FILE = path.join(os.homedir(), '.spark-wallet', 'cookie')

process.env.NODE_ENV || (process.env.NODE_ENV = 'production')
process.env.VERBOSE && (process.env.DEBUG = `lightning-client,spark,superagent,${process.env.DEBUG||''}`)
process.env.ONION_PATH && (process.env.ONION = true) // --onion-path implies --onion
process.env.PAIRING_QR && (process.env.PRINT_QR = true) // --pairing-qr implies --print-qr

if (process.env.TLS_PATH || process.env.TLS_NAME || process.env.LETSENCRYPT) process.env.FORCE_TLS = true

require('babel-polyfill')
require('./app')
