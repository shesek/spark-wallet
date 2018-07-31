# Spark Lightning Wallet

[![npm release](https://img.shields.io/npm/v/spark-wallet.svg)](https://www.npmjs.com/package/spark-wallet)
[![MIT license](https://img.shields.io/github/license/elementsproject/spark.svg)](https://github.com/elementsproject/spark-wallet/blob/master/LICENSE)
[![Pull Requests Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![IRC](https://img.shields.io/badge/chat-on%20freenode-brightgreen.svg)](https://webchat.freenode.net/?channels=c-lightning)

A wallet GUI for [c-lightning](https://github.com/ElementsProject/lightning),
accessible over the web or through mobile and desktop apps.

:zap: Simple & minimalistic
:zap: Purely off-chain
:zap: Near-zero configuration
:zap: Progressive Web App
:zap: Cordova and Electron builds
:zap: Personalizable themes
:zap: Automatic self-signed certs
:zap: Built-in Tor hidden service support
:zap:

-----

<img src="https://user-images.githubusercontent.com/877904/43122333-5122ca24-8f29-11e8-9426-58c8646f9d92.png" width="23%"></img>
&nbsp;&nbsp;&nbsp;
<img src="https://user-images.githubusercontent.com/877904/43122376-7543f93c-8f29-11e8-9363-5bc39cdb1807.png" width="23%"></img>
&nbsp;&nbsp;&nbsp;
<img src="https://user-images.githubusercontent.com/877904/43122396-8715d4f0-8f29-11e8-8736-266b5ecaf636.png" width="23%"></img>
&nbsp;&nbsp;&nbsp;
<img src="https://user-images.githubusercontent.com/877904/43122261-1c2428c2-8f29-11e8-8c29-e524de4aa82f.png" width="23%"></img>

> ⚠️ Spark is alpha-quality software under active development.
> Please use with care, preferably on testnet or with insignificant amounts.
> Spark comes with no guarantees and with support on a best-effort basis.

## Installation

Spark requires a running [c-lightning](https://github.com/ElementsProject/lightning) node, at home (preferably) or on the cloud.
See [setup instructions here](https://blockstream.com/2018/02/02/lightning-instant-bitcoin-transacting-tutorial.html).

Once c-lightning is running, install and start Spark with:

```bash
# $ npm install -g spark-wallet

$ npm install -g git+ssh://git@github.com:ElementsProject/spark#dist

$ spark-wallet # defaults: --ln-path ~/.lightning --port 9737
```

Or simply `$ npx spark-wallet`, which will install and start Spark in one go.
This should normally Just Work ™.

Spark will generate and print a random username and password that'll be used to login into the wallet.
To specify your own login credentials, set `--login [user]:[pass]` or the `LOGIN` environment variable.

To access the wallet, open `http://localhost:9737/` in your browser and login with the username/password.

To accept remote connections, set `--host <listen-address>` (shorthand `-i`, e.g. `-i 0.0.0.0`).
This will automatically enable TLS ([more details below](#tls)).

Spark can also be accessed using mobile and desktop apps instead of through the browser.
See ["Mobile app (Cordova)"](#mobile-app-cordova) and ["Desktop app (Electron)"](#desktop-app-electron)
for more details.
Note that the desktop app comes bundled with the Spark server and doesn't require the manual server setup described here.

See `$ spark-wallet --help` for the full list of available options (also available under ["CLI options"](#cli-options)).

#### Config file

Spark reads configuration options from `~/.spark-wallet/config` (can be overridden with `--config/-C <path>`).
The expected format is one `key=value` per line, like so:

```ini
ln-path=/data/lightning/testnet
login=bob:superSecretPassword
port=8000
```

## Features & Controls

Spark currently focuses on the core aspects of day-to-day usage: sending, receiving and viewing history.
For now, peers and channels are expected to be managed using the RPC.
Spark is a purely off-chain wallet, with no on-chain payments.

#### GUI controls

- **Display unit:** Click the balance on the top-right to toggle the currency display unit.
  The available options are sat, bits, milli, btc and usd.

- **Theme switcher:** Click the theme name on the bottom-right to change themes (you can choose between over 15 [bootswatch](https://bootswatch.com) themes).

- **Collapse payments:** Click on payments in the list to display more details.

- **Expert mode:** Click the version number on the bottom-left to toggle expert mode.
  This will add [two new menu items](https://user-images.githubusercontent.com/877904/43125383-89ac19b4-8f32-11e8-9a5e-d91eb5a637ea.png), "Logs" and
  ["RPC Console"](https://user-images.githubusercontent.com/877904/43122285-3854be8a-8f29-11e8-9329-d4c5c881c5e2.png),
  and display yaml dumps with additional information throughout the app.

## Progressive Web App

You can install Spark as a [PWA](https://developer.mozilla.org/en-US/Apps/Progressive) to get a more native-app-like experience,
including an home launcher that opens up in full screen, system notifications and improved page load times.

Available in Chrome mobile under `⋮` -> `Add to homescreen` ([see here](https://imgur.com/zVe1sOH)),
in Chrome desktop under `More tools` -> `Install to desktop` ([see here](https://i.imgur.com/Pj6FpGA.png))
and in Firefox mobile with an icon next to the address bar ([see here](https://mdn.mozillademos.org/files/15762/add-to-home-screen-icon.png)).

Note that installing the PWA on Android requires the TLS certificate to be signed by a CA
or manually added as a user trusted certificate ([instructions below](#add-as-trusted-certificate-to-android)).

Compared to the PWA, the main advantages of the mobile and desktop apps (below) are
the ability to handle `lightning:` URIs,
better security sandbox (detached from the browser)
and static client-side code.

## Mobile app (Cordova)

A Cordova-based native app for Android is available for download from the
[releases page](https://github.com/ElementsProject/spark/releases) (`spark.apk`).
It is not currently published to the app store.

When the app starts for the first time, you'll need to configure your Spark server URL and API access key.
You can print your access key to the console by starting Spark with `--print-key/-k`.
You can also scan this information from a QR, which you can get with `--pairing-qr`.

For the native app to properly communicate with the server, the TLS certificate has to be signed by a CA,
or manually added as a user trusted certificate ([instructions below](#add-as-trusted-certificate-to-android)).

## Desktop app (Electron)

Electron-based desktop apps for Linux (packaged as `AppImage`, `deb`, `snap` and `tar.gz`),
OS X and Windows are available for download from the
[releases page](https://github.com/ElementsProject/spark/releases).

The desktop app comes bundled with the Spark server-side component. If you're connecting to a local
c-lightning instance, you can configure the client to connect to it directly without manually setting-up
the Spark server.

Connecting to a remote c-lightning instance requires setting up the Spark server on the same machine
running c-lightning and connecting through it.

## TLS

Spark will by default generate a self-signed certificate and enable TLS when binding on a non-`localhost` address.

The self-signed certificate and key material will be saved to `~/.spark-wallet/tls/`.
To save to a different location, set `--tls-path`.
To set a custom "common name" for the generated certificate, set `--tls-name`.

To use your own TLS key and certificate, put your `key.pem` and `cert.pem` files in the `--tls-path` directory.

To disable TLS and start a plaintext HTTP server instead, set `--no-tls`.
Note that without TLS, Chrome will not allow accessing the camera on non-`localhost` hosts.

To enable TLS even for `localhost`, set `--force-tls`.

#### Add as Trusted Certificate to Android

To avoid the self-signed certificate warnings, you can add the certificate to Android's "user trusted certificates"
by following these steps:

1. Open Spark in your mobile web browser (skipping the warning).
2. Click the red TLS warning in the URL bar to view the certificate and ensure it matches the expected one
   (the certificate's SHA1 fingerprint is printed to the console during Spark's startup).
3. Navigate to `/cert.pem` to download the certificate file from the server and open it.
4. You should now see [this screen](https://i.imgur.com/f2DMWdL.png), allowing you to add a user trusted certificate.
   Fill in a name (e.g. "Spark"), leave "Used for" on "VPN and apps", and click OK.

Note that adding a user trusted certificate causes android to display a "Network may be monitored" notification.
It goes away after awhile.

## Tor Onion Hidden Service

To start Spark as a Tor hidden service (v3), set `--onion`.
Spark comes bundled with Tor (via [granax](https://github.com/bookchin/granax));
you don't have to pre-install anything for this to work.

Running Spark as a Tor hidden service has the following benefits:

- Tor onion URLs are self-authenticating and are pinned to your server's public key.
- In addition to authenticating the server, they also serve as a mean to authenticate the user - you can't access the server without knowing the `.onion` hostname.
- You don't have to setup port forwarding, everything is done with outbound connections.

Tor data files (including secret key material for the hidden service) will be saved to `~/.spark-wallet/tor/`. This can be overridden with `--onion-path`.

#### Connecting from Android

To connect to your hidden service using a web browser, install the
[Orbot](https://guardianproject.info/apps/orbot/) and [Orfox](https://guardianproject.info/apps/orfox/)
applications, open the `.onion` URL in Orfox, and enable JavaScript under `⋮` -> `NoScript`.

To connect using the Cordova app, configure Orbot to route Spark's traffic over the Tor VPN
(under "Tor-Enabled Apps"), then configure Spark to use the `.onion` server URL.

Instead of manually copying the `.onion` URL, you may want to specify `--print-qr/-Q` to print
the URL as a QR to the console.

## Adding to startup with `systemd`

```bash
# set config options in ~/.spark-wallet/config
$ echo login=bob:superSecretPass123 | tee -a ~/.spark-wallet/config

# create service file from template
$ curl -s https://raw.githubusercontent.com/ElementsProject/spark/master/contrib/spark-wallet.service |
  sed "s~{cmd}~`which spark-wallet`~;s~{user}~`whoami`~" |
  sudo tee /etc/systemd/system/spark-wallet.service

# inspect the generated service file, then load and start the service with:
$ sudo systemctl daemon-reload
$ sudo systemctl enable spark-wallet && sudo systemctl start spark-wallet
```

## Developing

Spark is written in a reactive-functional style using [rxjs](https://github.com/ReactiveX/rxjs) and [cycle.js](https://cycle.js.org),
with a nodejs/express server as the backend.

To start a development server with live compilation for babel, browserify, pug and stylus, run:

```bash
$ git clone https://github.com/ElementsProject/spark && cd spark
$ npm install
$ npm start -- --ln-path /data/lightning
```

The Cordova android app can be built by running `npm run cordova:dist`.
The `.apk` file will be created in `cordova/platforms/android/app/build/outputs/apk/debug/`.

Electron builds can be prepared with `npm run electron:dist`.
They will be available under `electron/dist`.

To get more verbose output in the browser developer console, set `localStorage.debug = 'spark:*'`.

Pull requests, suggestions and comments and welcome!

## CLI options

```bash
$ spark-wallet --help

  A wallet GUI for c-lightning, accessible over the web or through mobile and desktop apps.

  Usage
    $ spark-wallet [options]

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

    -k, --print-key         print access key to console (for use with the Cordova/Electron apps) [default: false]
    -Q, --print-qr          print QR code with the server URL [default: false]
    --pairing-qr            print QR code with embedded access key [default: false]
    --no-webui              run API server without serving client assets [default: false]

    -V, --verbose           display debugging information [default: false]
    -h, --help              output usage information
    -v, --version           output version number

  Example
    $ spark-wallet -l ~/.lightning

  All options may also be specified as environment variables:
    $ LN_PATH=/data/lightning PORT=8070 NO_TLS=1 spark-wallet
```

## License

MIT
