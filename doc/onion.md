# Tor Onion Hidden Service

To start Spark as a Tor hidden service (v3), set `--onion`.
Spark will install Tor automatically (via [granax](https://gitlab.com/bookchin/granax));
you don't have to pre-install anything for this to work.

Running Spark as a Tor hidden service has the following benefits:

- Communication is encrypted with strong cryptography (SHA3/ed25519 with perfect forward secrecy).

- Tor `.onion` hostnames are self-authenticating and are pinned to your server's public key.

- In addition to authenticating the server, they also serve as a mean to authenticate the user - you can't access the server without knowing the `.onion` hostname.
  That means that even if a security vulnerability is found on nodejs/Spark,
  an attacker will not be able to access the server in order to exploit it.

- You don't have to setup port forwarding, everything is done with outbound connections.
  Punch through routers with ease.

- Provides a static hostname even if you don't have a static IP.

Tor data files (including secret key material for the hidden service) will be saved to `~/.spark-wallet/tor/`. This can be overridden with `--onion-path`.

### Connecting from Android

To connect to your hidden service using a web browser, install the
[Orbot](https://guardianproject.info/apps/orbot/) and [Orfox](https://guardianproject.info/apps/orfox/)
applications, open the `.onion` URL in Orfox, and enable JavaScript under `⋮` -> `NoScript`.

To connect using the Cordova app, configure Orbot to route Spark's traffic over the Tor VPN
(under "Tor-Enabled Apps"), then configure Spark to use the `.onion` server URL.

Instead of manually copying the `.onion` URL, you may want to specify `--print-qr/-q` to print
the URL as a QR to the console, or `--pairing-qr/-Q` to also include the access key.
