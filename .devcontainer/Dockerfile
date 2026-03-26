FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

USER root

ENV DEBIAN_FRONTEND=noninteractive \
    FLUTTER_HOME=/usr/local/flutter

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        clang \
        cmake \
        libgtk-3-dev \
        liblzma-dev \
        ninja-build \
        openjdk-17-jdk \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch stable https://github.com/flutter/flutter.git "${FLUTTER_HOME}" \
    && chown -R node:node "${FLUTTER_HOME}"

ENV PATH="${FLUTTER_HOME}/bin:${FLUTTER_HOME}/bin/cache/dart-sdk/bin:${PATH}"

USER node

RUN flutter config --no-analytics \
    && flutter --version

WORKDIR /workspaces/biotrack-healthcare
