# Reproducible builds

The NPM package, Android `apk` builds, Linux `tar.gz`/`deb`/`snap` builds, macOS `zip` builds and Windows builds (installer and portable)
are deterministically reproducible.

The Linux `AppImage` builds are currently not. :-(

### Reproduce with Docker

A `Dockerfile` for reproducing the builds is available at `scripts/build-releases.Dockerfile`.
It can be used as follows:

```bash
$ git clone https://github.com/ElementsProject/spark && cd spark
$ docker build -f scripts/builder.Dockerfile -t spark-builder .
$ docker run -it -v `pwd`/docker-builds:/target spark-builder
```

The distribution files and a `SHA256SUMS` file will be created in `./docker-builds/`.

### NPM package

The npm package should be reproducible even without docker.
It should be sufficient to use node >=v6 and npm v5.4.2 to v5.6.x (preferably node v8.11.3 and npm v5.6.0).
Run `npm run dist:npm -- --pack-tgz` to create `spark-wallet-[x.y.z]-npm.tgz` in main directory.

The `npm-shrinkwrap.json` file inside the npm package commits to integrity checksums
for the entire dependency graph using
[Subresource Integrity](https://w3c.github.io/webappsec-subresource-integrity/).
