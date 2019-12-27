# TLS

Spark will by default generate a self-signed certificate and enable TLS when binding on a non-`localhost` address.

The self-signed certificate and key material will be saved to `~/.spark-wallet/tls/`.
To save to a different location, set `--tls-path`.
To set a custom "common name" for the generated certificate, set `--tls-name` (defaults to the value of `--host`).

To use your own TLS key and certificate, put your `key.pem` and `cert.pem` files in the `--tls-path` directory.

To disable TLS and start a plaintext HTTP server instead, set `--no-tls`.
Note that without TLS, Chrome will not allow accessing the camera on non-`localhost` hosts.

To enable TLS even for `localhost`, set `--force-tls`.

### LetsEncrypt integration

Setting `--letsencrypt <email>` will automatically setup a CA-signed certificate using LetsEncrypt.
This will make your certificate work everywhere without self-signed warnings.

```
$ spark-wallet --host mydomain.com --letsencrypt webmaster@mydomain.com
```

Requires a (sub)domain name, cannot be used with IP addresses.
If your domain is different from the host you're binding on, set `--tls-name`
(e.g. `--host 0.0.0.0 --tls-name mydomain.com`).

Note that verifying domain ownership requires binding an HTTP server on port 80, which normally requires root permissions.
You can either:

1. Start `spark-wallet` as root (simplest, but not recommended).

2. Use `setcap` to allow nodejs processes to bind on all ports: `$ sudo setcap 'cap_net_bind_service=+ep' $(which node)`

3. Bind the verification server to a different port with `--le-port 8080` (any port >1024 will work), then forward port 80 to it with:
   `$ iptables -A PREROUTING -t nat -p tcp --dport 80 -j REDIRECT --to-port 8080 && iptables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j DNAT --to-destination :8080`

4. If you already have another HTTP server running on port 80, you can reverse proxy requests coming to `/.well-known/acme-challenge/*` to the verification server.

   Example with nginx: `server { listen 80; server_name spark.foo.com; location /.well-known/acme-challenge/ { proxy_pass http://localhost:8080; } }`

After initially verifying your domain, you may start Spark with `--le-noverify` to skip starting the verification server.
This will work until the next renewal is due (every 90 days).

If you're having troubles, set `--le-debug` to show more debug information.

### Add as Trusted Certificate to Android

> ⚠️  NOTE: Recent android versions no longer respect user-trusted certificates.
> You'll need to setup a CA-signed certificate (see instructions above for the built-in LetsEncrypt integration),
> or use a separate encryption layer like an [onion hidden service](https://github.com/shesek/spark-wallet/blob/master/doc/onion.md),
> VPN or SSH tunnel.
>
> The instructions below may work for some older Android devices.

To avoid the self-signed certificate warnings (without a CA), you can add the certificate to your Android's "user trusted certificates"
by following these steps:

1. Open Spark in your mobile web browser (skipping the warning).
2. Click the red TLS warning in the URL bar to view the certificate and ensure it matches the expected one
   (the certificate's SHA1 fingerprint is printed to the console during Spark's startup).
3. Navigate to `/cert.pem` to download the certificate file from the server and open it.
4. You should now see [this screen](https://i.imgur.com/f2DMWdL.png), allowing you to add a user trusted certificate.
   Fill in a name (e.g. "Spark"), leave "Used for" on "VPN and apps", and click OK.

Note that adding a user trusted certificate causes android to display a "Network may be monitored" notification.
It can be flicked off.
