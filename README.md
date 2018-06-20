# Spark

[![npm release](https://img.shields.io/npm/v/spark-wallet.svg)](https://www.npmjs.com/package/spark-wallet)
[![MIT license](https://img.shields.io/github/license/elementsproject/spark.svg)](https://github.com/elementsproject/spark-wallet/blob/master/LICENSE)
[![Pull Requests Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![IRC](https://img.shields.io/badge/chat-on%20freenode-brightgreen.svg)](https://webchat.freenode.net/?channels=c-lightning)

A web GUI for c-lightning, with a simple and lightweight interface for day-to-day usage.
Optimized for use by mobile and tablets.

## Setup

Spark requires a running [c-lightning](https://github.com/ElementsProject/lightning) node, at home (preferably) or on the cloud.
See [setup instructions here](https://blockstream.com/2018/02/02/lightning-instant-bitcoin-transacting-tutorial.html).

Once c-lightning is running, install and start Spark with:

```bash
$ npm install -g spark-wallet

$ spark --ln-path ~/.lightning
```

Spark will generate and print a random username and password that'll be used to login into the wallet.
To specify your own login credentials, set `--login [user]:[pass]` or the `LOGIN` environment variable.

To access the wallet, open `https://localhost:9117/` in your browser, skip the self-signed TLS certificate warning (see more below on TLS), and login with the username/password.

See `$ spark --help` for the full list of available options (also available below).

## Features

Supports the core functions of a lightning wallet: sending, receiving and history.

Does not (yet) support peers and channels management, which are expected to be managed using the RPC for now.

TODO: screenshots, explain currency/theme/expert controls, etc

## TLS

Spark will by default generate a self-signed TLS certificate and save it to `./spark-tls`.

To save the self-signed certificate to another location, set `--tls-path`.
To set a custom "common name" for the generated certificate, set `--tls-name`.

To use your own TLS key and certificate, put your `key.pem` and `cert.pem` files in the `--tls-path` directory.

To disable TLS and start a plaintext HTTP server instead, set `--no-tls`.

### Add as Trusted Certificate to Android

To avoid the self-signed certificate warnings, you can add the certificate to Android's "user trusted certificates"
by following these steps:

1. Open Spark in your mobile web browser (skipping the warning).

2. Click the red TLS warning in the URL bar to view the certificate and ensure it matches the expected one
   (the certificate's SHA1 fingerprint is printed to the console during Spark's startup).

3. Navigate to `/cert.pem` to download the certificate file from the server, and open it.

4. You should now see [this screen](https://i.imgur.com/f2DMWdL.png), allowing you to add a user trusted certificate.
   Fill in a name (e.g. "Spark"), leave "Used for" on "VPN and apps", and click OK.

## Tor Onion Hidden Service

To start Spark as a Tor hidden service (v3), set `--onion`. Tor data files will be saved to `./spark-tor` (can be overriden with `--onion-path`).

Spark comes bundled with Tor (via [granax](https://github.com/bookchin/granax));
You don't have to pre-install anything for this to work.

Running Spark as a Tor hidden service has the following benefits:

- Tor onion URLs are self-authenticating and are pinned to your server's public key.

- In addition to authenticating the server, they also serve as a mean to authenticate the user - you can't access the server without knowing the `.onion` hostname.

- You don't have to setup port forwarding, everything is done with outbound connections.

Rather than manually copying the `.onion` URL, you may want to specify `--print-qr` (shorthand `-Q`) to print
the URL as a QR to the console.

## Developing

To start a development environment with live compilation for babel, browserify and stylus, run:

```bash
$ git clone https://github.com/ElementsProject/spark && cd spark
$ npm install
$ npm start -- --ln-path /data/lightning
```

## Cordova App

A Cordova-based native app for Android can be built by running `npm run cordova:dist`.
The `.apk` file will be created in `cordova/platforms/android/app/build/outputs/apk/debug/`.

The advantages of using the native app are:

- Ability to register as an handler for `lightning:` URIs.

- Home launcher button and a full-screen with no navigation bars.

- More stable, albeit somewhat slower, QR scanner.

For the native app to properly communicate with the server, the TLS certificate has to be signed by a CA,
or manually added as a user trusted certificate (see above). (*TODO: TLS key pinning*)

The native app is currently not published to the app store and has to be manually built and installed.

## Mobile "Add to homescreen"

Alternatively, thanks to the [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest),
you can get some of the benefits of a native app using the ["Add to homescreen"](https://i.imgur.com/zVe1sOH.png) feature.

This will add a home launcher that opens up in full screen.
With recent Firefox Mobile, this also allows the website to register as an handler for `lightning:` URIs!
(see [compatibility table](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/protocol_handlers#Browser_compatibility))

Note that a trusted certificate is required in order for "Add to homepage" to work.

## CLI options

```bash
$ spark --help

  A GUI web interface for c-lightning

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
```

## License

MIT
