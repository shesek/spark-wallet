# Changelog

## Unreleased

- Changed the way the balance shown in the top-right corner is calculated. See:

  https://github.com/shesek/spark-wallet/issues/62

  https://github.com/shesek/spark-wallet/commit/9b500c48c4c32fd61a11995410f17adf9f6cdf8d

- Add support for running a Tor hidden service in non-anonymous mode. This makes the hidden service faster, at the cost of losing the privacy benefits.

  From the [Tor documentation](https://2019.www.torproject.org/docs/tor-manual.html#HiddenServiceSingleHopMode):

  > Non Anonymous Hidden Services on a tor instance in HiddenServiceSingleHopMode make one-hop (direct) circuits between the onion service server, and the introduction and rendezvous points. (Onion service descriptors are still posted using 3-hop paths, to avoid onion service directories blocking the service.) This option makes every hidden service instance hosted by a tor instance a Single Onion Service. One-hop circuits make Single Onion servers easily locatable, but clients remain location-anonymous. However, the fact that a client is accessing a Single Onion rather than a Hidden Service may be statistically distinguishable.

  To enable this mode, set `--onion-nonanonymous`.

- Allow specifying a proxy server for making HTTP requests (currently, requests are only sent for fetching the exchange rate)
  using the standard `HTTP(S)_PROXY`/`ALL_PROXY` environment variables (or the matching `--http(s)-proxy` / `--all-proxy` CLI args).
  See [proxy-from-env](https://github.com/Rob--W/proxy-from-env) for more details.

- Add support for fetching exchanges rates from the Wasabi API (#78)

  Can be set with `--rate-provider wasabi` (requires Tor, either as a transparent proxy or using `--all-proxy socks5h://127.0.0.1:9050`).

- Allow disabling exchange rate lookup using `--no-rates` (#81)

- Switch from Oracle Java to OpenJDK for building the Android app (#79, #84)

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
