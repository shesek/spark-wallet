## Setting up Spark with Docker

You can use Docker To setup Spark, a bitcoind node and a c-lightning node all in go with the following command:

```bash
$ docker run -v ~/.spark-docker:/data -p 9737:9737 \
             shesek/spark-wallet --login bob:superSecretPass456
```

You will then be able to access the Spark wallet at `https://localhost:9737`.

Runs in `testnet` mode by default, set `NETWORK` to override (e.g. `-e NETWORK=bitcoin`).

Data files will be stored in `~/.spark-docker/{bitcoin,lightning,spark}`.
You can set Spark's configuration options in `~/.spark-docker/spark/config`.

When starting for the first time, you'll have to wait for the bitcoin node to sync up.
You can check the progress by tailing `~/.spark-docker/bitcoin/debug.log`.

You can set custom command line options for `bitcoind` with `BITCOIND_OPT`
and for `lightningd` with `LIGHTNINGD_OPT`.

Note that TLS will be enabled by default (even without changing `--host`).
You can use `--no-tls` to turn it off.

#### With existing `lightningd`

To connect to an existing `lightningd` instance running on the same machine,
mount the lightning data directory to `/etc/lightning`:

```bash
$ docker run -v ~/.spark-docker:/data -p 9737:9737 \
             -v ~/.lightning:/etc/lightning \
             shesek/spark-wallet
```

Connecting to remote lightningd instances is currently not supported.

#### With existing `bitcoind`, but with bundled `lightningd`

To connect to an existing `bitcoind` instance running on the same machine,
mount the bitcoin data directory to `/etc/bitcoin` (e.g. `-v ~/.bitcoin:/etc/bitcoin`),
and either use host networking (`--network host`) or specify the IP where bitcoind is reachable via `BITCOIND_RPCCONNECT`.
The RPC credentials and port will be read from bitcoind's config file.

To connect to a remote bitcoind instance, set `BITCOIND_URI=http://[user]:[pass]@[host]:[port]`
(or use `__cookie__:...` as the login for cookie-based authentication).
