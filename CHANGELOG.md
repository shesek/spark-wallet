# Changelog

- ui: Add a new interface for withdrawing on-chain funds

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
