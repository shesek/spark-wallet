FROM node:8.11.3-stretch
# with npm v5.6.0

ENV TZ=UTC
ENV PATH=./node_modules/.bin:$PATH
# npm doesn't normally like running as root, allow it since we're in docker
RUN npm config set unsafe-perm true

RUN apt-get update && apt-get install -y --no-install-recommends git faketime binutils software-properties-common apt-transport-https unzip

# Wine for Electron Windows builds
# copied from https://github.com/electron-userland/electron-builder/blob/master/docker/wine/Dockerfile
RUN dpkg --add-architecture i386 \
  && apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv-keys 818A435C5FCBF54A \
  && apt-add-repository https://dl.winehq.org/wine-builds/debian \
  && apt-get update && apt-get install -y --no-install-recommends winehq-stable
#RUN apt-get install --no-install-recommends unzip
#RUN curl -L https://github.com/electron-userland/electron-builder-binaries/releases/download/wine-2.0.3-mac-10.13/wine-home.zip > /tmp/wine-home.zip && unzip /tmp/wine-home.zip -d /root/.wine && unlink /tmp/wine-home.zip
ENV WINEDEBUG -all,err+all
ENV WINEDLLOVERRIDES winemenubuilder.exe=d

# make sure Wine runs without libfaketime, which is required for the parent process (electron-builder) to make
# builds reproducible, but breaks wine.
RUN echo '#!/bin/sh\nLD_PRELOAD="" '$(which wine)' "$@"' > /usr/local/sbin/wine && chmod +x /usr/local/sbin/wine


# Dependencies for building Android apps: Java, SDK tools & Gradle
ENV JAVA_HOME=/usr/lib/jvm/java-8-oracle
ENV ANDROID_HOME=/root/sdktools
ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:/root/gradle-4.1/bin
WORKDIR /root
# Oracle Java 8
RUN add-apt-repository "deb http://ppa.launchpad.net/webupd8team/java/ubuntu xenial main" -y \
  && apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv-keys C2518248EEA14886 \
  && apt-get update \
  && echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections \
  && mkdir -p /usr/share/man/man1 \
  # mkdir because of https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=863199
  && apt-get install -y --no-install-recommends oracle-java8-installer
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
COPY electron/package.json electron/npm-shrinkwrap.json ./
RUN npm install
COPY electron ./
# build a dummy electron app, to trigger a download of all the required artifacts files in docker build time.
# See https://github.com/electron-userland/electron-builder/issues/3220 for details.
RUN mkdir www && electron-builder --linux --mac --win -c.extraMetadata.version=0.0.0 && rm -rf www dist

# Cordova dependencies
WORKDIR /opt/spark/cordova
COPY cordova/package.json cordova/npm-shrinkwrap.json cordova/config.xml ./
COPY cordova/res ./res
RUN npm install && cordova telemetry off
# build a dummy cordova app to download required artifacts as an early cached stage
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

# Build NPM package, Electron apps and Android Cordova to /target
CMD npm run dist:npm -- --pack-tgz \
 && npm run dist:electron -- --linux --mac --win \
 && npm run dist:cordova -- --release \
 && mkdir -p /target && rm -rf /target/* \
 && echo '-----BEGIN SHA256SUM-----' \
 && ./scripts/dist-shasums.sh | tee /target/SHA256SUMS \
 && mv spark-wallet-*-npm.tgz /target \
 && mv -f dist /target/npm-unpacked \
 && mv -f electron/dist /target/electron \
 && mv -f cordova/platforms/android/app/build/outputs/apk/release /target/cordova-android \
 && (test -z "$OWNER" || chown -R $OWNER /target)
