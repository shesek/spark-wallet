# Changelog

## 0.2.14 - 2020-04-22

- Fix: Resolve desktop app regression introduced in the last release (#143)

- Electron: Update to v8

- Docker: Updade nodejs to v12

## 0.2.13 - 2020-04-11

- Fix: Resolve TLS issues with NodeJS 10 (#55, h/t @sumBTC!)

- Fix: Some QR codes not read properly in the web QR scanner (#134)

- Docker: Update Bitcoin Core to v0.19.1 and c-lightning to v0.8.1

## 0.2.12 - 2019-12-22

- Docker: Update to c-lightning v0.8.0

- Docker: Compatibility with c-lightning v0.8.0 network subdirectories

- Detect if the "base directory" is provided and default to the bitcoin mainnet network subdirectory within in. (#130)

  This allows users to start spark using the existing command they use (with i.e. `--ln-path ~/.lightning`)
  to ease the upgrade to c-lightning v0.8.0, but this usage is considered deprecated and will eventually be removed.
  Users are advised to explicitly specify the path to the network subdirectory with `--ln-path ~/.lightning/<network>`.

- Don't display unconfirmed onchain balance (#129)

- Cordova Android: Allow connecting to server in cleartext (#132)

  This was possible before v0.2.11 which updated the Android SDK to version 28.
  Not really recommended, but useful for development and testnet/regtest demonstrations.

## 0.2.11 - 2019-12-15

- Fix channels view (#128)

- Fix Android crashes caused by plugin-local-notifications (https://github.com/katzer/cordova-plugin-local-notifications/issues/1541)

## 0.2.10 - 2019-12-08

- Docker: Update to Bitcoin Core v0.19.0.1 and c-lightning v0.7.3

- Fix bug with missing channel reserve (3d1f3b2cc84627ac38ff64bd09aa1d3b5fd74bfe)

## 0.2.9 - 2019-10-17

- *BREAKING CHANGE:* Dropped support for c-lightning before 0.7.0

- Compatibility with c-lightning v0.7.3 (upcoming, currently rc), as well as previous v0.7.x with allow-deprecated-apis=false

- Docker: Add standalone arm32v7 and arm64v8 images (#93)

  Available using the new multiarch image at `shesek/spark-wallet:standalone` and `shesek/spark-wallet:VERSION-standalone`,
  or directly using `shesek/spark-wallet:standalone-arm32v7` and `shesek/spark-wallet:VERSION-standalone-arm32v7`.

  Thanks @NicolasDorier!

- Docker: Upgrade to Bitcoin Core v0.18.1 and c-lightning v0.7.2

- Upgrade to RxJS v6, Babel v7, Cycle-run v10

- Allow enabling CORS using `--allow-cors <origin>` (#101)

- Some minor UI improvements to the balance overview (soon to be replaced entirely)

## 0.2.8 - 2019-06-09

- Security: Make npm-shrinkwrap actually ship with the npm package ([5827098ec](https://github.com/shesek/spark-wallet/commit/5827098ecc301e449e58e6077b0abf4e63aa9635))

- Fix: Make QR scanner work in dark themes (a regression introduced in v0.2.6, #91)

- Fix: Make the "Open wallet" link (bitcoin:<addr>) work in the Android app

- Docker: Use tini to init the container process (#90, thanks @NicolasDorier)

- Update client-side npm dependencies

## 0.2.7 - 2019-06-07

- Fix a bug in the homepage on-chain/channel balances display

## 0.2.6 - 2019-06-07

- Changed the way the balance shown in the top-right corner is calculated. See:

  https://github.com/shesek/spark-wallet/issues/62

  https://github.com/shesek/spark-wallet/commit/9b500c48c4c32fd61a11995410f17adf9f6cdf8d

- Display channel and on-chain balances separately on the homepage (#67)

- Add support for running a Tor hidden service in non-anonymous mode. This makes the hidden service faster, at the cost of losing the privacy benefits.

  From the [Tor documentation](https://2019.www.torproject.org/docs/tor-manual.html#HiddenServiceSingleHopMode):

  > Non Anonymous Hidden Services on a tor instance in HiddenServiceSingleHopMode make one-hop (direct) circuits between the onion service server, and the introduction and rendezvous points. (Onion service descriptors are still posted using 3-hop paths, to avoid onion service directories blocking the service.) This option makes every hidden service instance hosted by a tor instance a Single Onion Service. One-hop circuits make Single Onion servers easily locatable, but clients remain location-anonymous. However, the fact that a client is accessing a Single Onion rather than a Hidden Service may be statistically distinguishable.

  To enable this mode, set `--onion-nonanonymous`.

- Allow specifying a proxy server for making HTTP requests (currently, requests are only sent for fetching the exchange rate)
  using the standard `HTTP(S)_PROXY`/`ALL_PROXY` environment variables or the `--proxy` CLI arg (which is an alias for `ALL_PROXY`).
  See [proxy-from-env](https://github.com/Rob--W/proxy-from-env) for more details.

- Add support for fetching exchanges rates from the Wasabi API (#78)

  Can be set with `--rate-provider wasabi` (requires Tor, either as a transparent proxy or using `--proxy socks5h://127.0.0.1:9050`).

- Allow disabling exchange rate lookup using `--no-rates` (#81)

- Switch from Oracle Java to OpenJDK for building the Android app (#79, #84)

- Update to Electron v5

## 0.2.5 - 2019-02-24

- Use the compact alphanumeric QR encoding mode for bech32 addresses

- Accept "slow", "normal" and "urgent" as feerate values

- Various UI improvements to the deposit page

## 0.2.4 - 2019-02-17

- Enable cookie file by default, persists random login credentials to `~/.spark-wallet/cookie`.

- Add `--pairing-url` CLI option

- bugfix: Properly parse boolean args in RPC console

- ui: Add a new interface for making on-chain deposits

- Update npm dependencies

## 0.2.3 - 2019-01-31

- docker: Update c-lightning to v0.6.3

- docker: Update Bitcoin Core to v0.17.1

- docker: Verify digital signature for c-lightning

- docker: Fix missing dependency in standalone mode (#53)

- ui: Improve invoice description word break

- ui: Hide peers debug information in node info page


## 0.2.2 - 2018-12-22

- ui: Skip to manual BOLT11 entry on non-touch devices

- docker: Improve docker handling of SIGTERM signals

## 0.2.1 - 2018-12-13

- Add `--cookie-file/-C <path>` to persist randomly generated login credentials to `<path>`
  (similar to the cookie file feature in bitcoind)

- Add `--public-url` CLI option

- Add standalone docker image variant available as
  shesek/spark-wallet:x.y.z-standalone and shesek/spark-wallet:standalone

- Prevent access-key from being saved to browser history when pairing with query string

- Accept access-key as request body parameter

## 0.2.0 - 2018-12-11

- Channel management: display how much more we need to receive in order to spend

- Now available on Google Play: https://play.google.com/store/apps/details?id=com.spark.wallet

## 0.2.0-rc.3 - 2018-12-09

- Channel management: display available on-chain balance and add "fund max" option

- Channel management: display channel age in number of blocks and estimated fuzzy time duration

- Cordova: build signed APK files

## 0.2.0-rc.2 - 2018-12-04

- Bug fix: calculate off-chain balance correctly

- Docker: update c-lightning and Bitcoin Core

## 0.2.0-rc.1 - 2018-12-03

- Channel management GUI

- Update Electron to v3.0.10

- Update Cordova to v8.1.2

## 0.1.3 - 2018-11-26

- Various fixes for BOLT11 payment request parsing (#28, #35, 1489777f6)

- Update npm, build and cordova dependencies

## 0.1.2 - 2018-09-25

- Bug fix: plain HTTP to TLS redirection under nodejs v9.6+ (#10, aef8693ded25a956bc)

- Bug fix: treat socket errors as warnings instead of crashing the process (#23, 56635b8af3fb54)

- Docker: Update to Bitcoin Core v0.16.3 (e718bf8324599)

- Docker: Rename {SPARK,BITCOIND}_OPTS to {SPARK,BITCOIND}_OPT (#18, 4a66cb0b6c24)

- Electron: Rename desktop app executable to `spark-desktop`, to prevent confusion with the `spark-wallet` server daemon
  (https://github.com/shesek/spark-wallet/issues/24#issuecomment-421798958, 9f81f14c9344)

- Improve balance calculation (#26, 8bda5984131fe6)

## 0.1.1 - 2018-08-29

- Android: don't generate release builds

## 0.1.0 - 2018-08-29

Public release! 🎇 🎉 🎈

- Improve reproducibility of `apk`, `snap` and npm package builds
- Bug fix: don't display payments twice

## 0.0.1 - 2018-08-26

First versioned release.
