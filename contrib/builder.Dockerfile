FROM node:8.11.3-stretch
# with npm v5.6.0

ENV TZ=UTC
RUN apt-get update && apt-get install -y --no-install-recommends git faketime binutils software-properties-common apt-transport-https

# Wine for Electron Windows builds.
# copied from https://github.com/electron-userland/electron-builder/blob/master/docker/wine/Dockerfile
RUN dpkg --add-architecture i386 \
  && curl -L https://dl.winehq.org/wine-builds/Release.key > Release.key && apt-key add Release.key && apt-add-repository https://dl.winehq.org/wine-builds/debian \
  && apt-get update && apt-get install -y --no-install-recommends winehq-stable
#RUN apt-get install --no-install-recommends unzip
#RUN curl -L https://github.com/electron-userland/electron-builder-binaries/releases/download/wine-2.0.3-mac-10.13/wine-home.zip > /tmp/wine-home.zip && unzip /tmp/wine-home.zip -d /root/.wine && unlink /tmp/wine-home.zip

ENV WINEDEBUG -all,err+all
ENV WINEDLLOVERRIDES winemenubuilder.exe=d

# Make sure Wine runs without libfaketime, which is required for the parent process (electron-builder) to make
# builds reproducible, but breaks wine.
RUN echo '#!/bin/sh\nLD_PRELOAD="" '$(which wine)' "$@"' > /usr/local/sbin/wine && chmod +x /usr/local/sbin/wine

# npm doesn't normally like running as root, allow it since we're in docker
RUN npm config set unsafe-perm true


# Install electron dependencies early, they don't change often
WORKDIR /opt/spark/electron
COPY electron/package.json electron/npm-shrinkwrap.json ./
RUN npm install
COPY electron ./

# Build a dummy electron app, to trigger a download of all the required artifacts files in docker build time.
# See https://github.com/electron-userland/electron-builder/issues/3220 for details.
RUN mkdir www && DEBUG=* npx electron-builder --linux --mac --win -c.extraMetadata.version=0.0.0 && rm -rf www dist


# Install Spark dependencies
WORKDIR /opt/spark/client
COPY client/package.json client/npm-shrinkwrap.json ./
COPY client/fonts ./fonts
RUN npm install

WORKDIR /opt/spark
COPY package.json npm-shrinkwrap.json ./
RUN npm install --no-optional

COPY . .

# Build NPM package and Electron builds. Cordoava is not built.
CMD npm run dist:npm -- --pack-tgz \
 && npm run dist:electron -- --linux --mac --win \
 && mkdir -p /target && rm -rf /target/* \
 && ./contrib/dist-shasums.sh | tee /target/SHA256SUMS \
 && mv spark-wallet-*-npm.tgz /target \
 && mv -f dist /target/npm-unpacked \
 && mv -f electron/dist /target/electron \
 && (test -z "$OWNER" || chown -R $OWNER /target)


# ----
# Environment for making Cordova Android builds.
# Currently unused, because the apk isn't deterministic.

#ENV JAVA_HOME=/usr/lib/jvm/java-8-oracle
#ENV ANDROID_HOME=/root/sdktools
#ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:/root/gradle-4.1/bin
#
#RUN apt-get update && apt-get install -y --no-install-recommends git curl software-properties-common unzip
#
# Install Java 8
#RUN add-apt-repository "deb http://ppa.launchpad.net/webupd8team/java/ubuntu xenial main" -y && apt-get update \
#  && echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections \
#  && mkdir /usr/share/man/man1 \
#  && apt-get install -y --no-install-recommends oracle-java8-installer
## mkdir because of https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=863199
#
## Install Android SKD tools
## @TODO verify download hashes
#RUN wget -O ~/android-tools.zip https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip \
#  && unzip ~/android-tools.zip -d ~/sdktools && rm ~/android-tools.zip \
#  && yes | (sdkmanager platform-tools "platforms;android-27" "build-tools;27.0.3" && sdkmanager --licenses)
#
## Install Gradle 4.1
#RUN wget -O ~/gradle.zip https://services.gradle.org/distributions/gradle-4.1-bin.zip \
#  && unzip ~/gradle.zip -d ~ && rm ~/gradle.zip
