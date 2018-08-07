#!/usr/bin/env bash

################################################
# Build script for sparkswapd
#
# Params:
# - INCLUDE_DOCKER (optional, defaults to false)
################################################

set -e -u

ARG=${1:-false}

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Reinstalling dependencies"
npm i

echo "Checking broker.proto file for issues"
npm run broker-proto

echo "Downloading relayer proto files"

# Blow away proto directory and recreate or git-clone will yell at us
if [ -d ./proto ]; then
  rm -rf ./proto
fi

git clone https://github.com/sparkswap/relayer-proto.git ./proto
rm -rf ./proto/.git

# If we want to build images with the command then we can use
if [ "$ARG" != "no-docker" ]; then
  echo "Building broker docker images"
  npm run build-images
fi
