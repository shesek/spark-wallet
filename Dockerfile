FROM node:8.11-slim as builder

# Install c-lightning
RUN apt-get update && apt-get install -y --no-install-recommends autoconf automake build-essential git libtool libgmp-dev \
  libsqlite3-dev python python3 wget zlib1g-dev

ARG LIGHTNINGD_VERSION=0d3c3a225e532d54e5371394dbff7240500a0431
ARG DEVELOPER

RUN git clone https://github.com/ElementsProject/lightning.git /opt/lightningd \
    && cd /opt/lightningd \
    && git checkout $LIGHTNINGD_VERSION \
    && DEVELOPER=$DEVELOPER ./configure \
    && make

# Install bitcoind
ENV BITCOIN_VERSION 0.16.2
ENV BITCOIN_URL https://bitcoincore.org/bin/bitcoin-core-$BITCOIN_VERSION/bitcoin-$BITCOIN_VERSION-x86_64-linux-gnu.tar.gz
ENV BITCOIN_SHA256 71f217e30e98d5ccc1fb574b9499595e87e118e596278fad5507a7b84650859c
ENV BITCOIN_ASC_URL https://bitcoincore.org/bin/bitcoin-core-$BITCOIN_VERSION/SHA256SUMS.asc
ENV BITCOIN_PGP_KEY 01EA5486DE18A882D4C2684590C8019E36C2E964
RUN mkdir /opt/bitcoin && cd /opt/bitcoin \
    && wget -qO bitcoin.tar.gz "$BITCOIN_URL" \
    && echo "$BITCOIN_SHA256 bitcoin.tar.gz" | sha256sum -c - \
    && gpg --keyserver keyserver.ubuntu.com --recv-keys "$BITCOIN_PGP_KEY" \
    && wget -qO bitcoin.asc "$BITCOIN_ASC_URL" \
    && gpg --verify bitcoin.asc \
    && BD=bitcoin-$BITCOIN_VERSION/bin \
    && tar -xzvf bitcoin.tar.gz $BD/bitcoind $BD/bitcoin-cli --strip-components=1

# npm doesn't normally like running as root, allow it since we're in docker
RUN npm config set unsafe-perm true

# Install Spark
WORKDIR /opt/spark/client
COPY client/package.json client/npm-shrinkwrap.json ./
COPY client/fonts ./fonts
RUN npm install

WORKDIR /opt/spark
COPY package.json npm-shrinkwrap.json ./
RUN npm install
COPY . .

# Build production NPM package
RUN npm run dist:npm \
 && npm prune --production \
 && find . -mindepth 1 -maxdepth 1 \
           ! -name '*.json' ! -name dist ! -name LICENSE ! -name node_modules ! -name scripts \
           -exec rm -r "{}" \;

# Prepare final image

FROM node:8.11-slim

WORKDIR /opt/spark

RUN apt-get update && apt-get install -y --no-install-recommends inotify-tools libgmp-dev libsqlite3-dev xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /opt/spark/dist/cli.js /usr/bin/spark-wallet \
    && mkdir /data \
    && ln -s /data/lightning $HOME/.lightning

COPY --from=builder /opt/lightningd/cli/lightning-cli /usr/bin
COPY --from=builder /opt/lightningd/lightningd/lightning* /usr/bin/
COPY --from=builder /opt/bitcoin/bin /usr/bin
COPY --from=builder /opt/spark /opt/spark

ENV CONFIG=/data/spark/config TLS_PATH=/data/spark/tls TOR_PATH=/data/spark/tor HOST=0.0.0.0

# link the hsv3 (Tor Hidden Service V3) node_modules installation directory
# inside /data/spark/tor/, to persist the Tor Bundle download in the user-mounted volume
RUN ln -s $TOR_PATH/tor-installation/node_modules dist/transport/hsv3-dep/node_modules

ENTRYPOINT [ "scripts/docker-entrypoint.sh" ]

EXPOSE 9735 9737
