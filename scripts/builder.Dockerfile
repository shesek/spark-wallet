# nodejs v12.5 doesn't play well with the `faketime` library used for deterministic builds
FROM node:12.4-stretch

ENV TZ=UTC
ENV PATH=./node_modules/.bin:$PATH
# npm doesn't normally like running as root, allow it since we're in docker
RUN npm config set unsafe-perm true

RUN apt-get update && apt-get install -y --no-install-recommends git=1:2.11.0-3+deb9u7 binutils=2.28-5 software-properties-common=0.96.20.2-1+deb9u1 \
  apt-transport-https=1.4.10 unzip=6.0-21+deb9u2 faketime=0.9.6-7+b1 fuse=2.9.7-1+deb9u2 disorderfs=0.5.1-1+b1

# Wine for Electron Windows builds
# copied from https://github.com/electron-userland/electron-builder/blob/master/docker/wine/Dockerfile
RUN dpkg --add-architecture i386 \
  && apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv-keys D43F640145369C51D786DDEA76F1A20FF987672F \
  && apt-add-repository https://dl.winehq.org/wine-builds/debian \
  && apt-get update && apt-get install -y --no-install-recommends winehq-stable=5.0.2~stretch
ENV WINEDEBUG -all,err+all
ENV WINEDLLOVERRIDES winemenubuilder.exe=d

# make sure Wine runs without libfaketime, which is required for the parent process (electron-builder) to make
# builds reproducible, but breaks wine.
RUN echo '#!/bin/sh\nLD_PRELOAD="" '$(which wine)' "$@"' > /usr/local/sbin/wine && chmod +x /usr/local/sbin/wine


# Dependencies for building Android apps: Java, SDK tools & Gradle
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV ANDROID_HOME=/root/sdktools
ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:/root/gradle-4.1/bin
WORKDIR /root
# Java 8 (OpenJDK)
RUN apt-get install -y --no-install-recommends openjdk-8-jdk-headless=8u275-b01-1~deb9u1

# Android SKD tools
RUN wget -q -O sdktools.zip https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip \
  && echo "92ffee5a1d98d856634e8b71132e8a95d96c83a63fde1099be3d86df3106def9 sdktools.zip" | sha256sum -c - \
  && unzip -q sdktools.zip -d $ANDROID_HOME && rm sdktools.zip \
  && yes | (sdkmanager platform-tools "platforms;android-27" "build-tools;27.0.3" && sdkmanager --licenses) > /dev/null 2>&1
# Gradle 4.1
RUN wget -q https://services.gradle.org/distributions/gradle-4.1-bin.zip \
  && echo "d55dfa9cfb5a3da86a1c9e75bb0b9507f9a8c8c100793ccec7beb6e259f9ed43 gradle-4.1-bin.zip" | sha256sum -c - \
  && unzip -q gradle-4.1-bin.zip -d ~ && rm gradle-4.1-bin.zip


# Electron dependencies
WORKDIR /opt/spark/electron
COPY electron/package.json electron/npm-shrinkwrap.json electron/hook-afterPack.js ./
RUN npm install
# build a dummy electron app, to trigger a download of all the required artifacts files in docker build time
# see https://github.com/electron-userland/electron-builder/issues/3220 for details.
RUN mkdir www && echo '/**/' > main.js && electron-builder --linux --mac --win -c.extraMetadata.version=0.0.0 && rm -rf www main.js dist

# Cordova dependencies
WORKDIR /opt/spark/cordova
COPY cordova/package.json cordova/npm-shrinkwrap.json cordova/config.xml ./
COPY cordova/res ./res
RUN npm install && cordova telemetry off
# build a dummy cordova app to download required artifacts in docker build time
RUN mkdir www && cordova prepare && cordova build && rm -r www platforms/android/app/build

# Spark client
WORKDIR /opt/spark/client
COPY client/package.json client/npm-shrinkwrap.json ./
COPY client/fonts ./fonts
RUN npm install

# Spark main
WORKDIR /opt/spark
COPY package.json npm-shrinkwrap.json ./
RUN npm install

COPY . .

# required for reproducible snap builds
RUN chmod -R 755 electron

# Build NPM package, Electron apps and Android Cordova to /target
CMD (test ! -c /dev/fuse || (mv -f cordova cordova-src && mkdir cordova && disorderfs --sort-dirents=yes --reverse-dirents=no cordova-src cordova)) \
 && npm run dist:npm -- --pack-tgz \
 && npm run dist:electron -- --linux --mac --win \
 && npm run dist:cordova \
 && mkdir -p /target && rm -rf /target/* \
 && echo '-----BEGIN SHA256SUM-----' \
 && ./scripts/dist-shasums.sh | tee /target/SHA256SUMS \
 && mv spark-wallet-*-npm.tgz /target \
 && mv -f dist /target/npm-unpacked \
 && mv -f electron/dist /target/electron \
 && mv -f cordova/platforms/android/app/build/outputs/apk/debug /target/cordova-android-debug \
 && (test -z "$OWNER" || chown -R $OWNER /target)

# disorderfs (fuse mount configured with stable file sorting) is required for reproducible android apk builds. See:
# https://lists.reproducible-builds.org/pipermail/rb-general/2018-June/001027.html
# https://issuetracker.google.com/issues/110237303
# https://code.briarproject.org/briar/briar/issues/1273
#
# This requires running docker with "--cap-add SYS_ADMIN --device /dev/fuse --security-opt apparmor:unconfined".
# If you don't care about apk reproducibility, you can skip this.
