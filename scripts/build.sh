#!/usr/bin/env bash

################################################
# Build script for sparkswapd
#
# Params:
# - EXTERNAL_ADDRESS (optional, for hosted daemons)
################################################

set -e -u

# Setting this env is ONLY required for a hosted broker setup.
#
# This address is used during the build process so that certs can be generated
# correctly for a hosted (remote) broker daemon.
EXTERNAL_ADDRESS=${EXTERNAL_ADDRESS:-}

ARG=${1:-false}

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Reinstalling dependencies"
npm install

echo "Checking broker.proto file for issues"
npm run broker-proto

echo "Downloading relayer proto files"

# Blow away proto directory and recreate or git-clone will yell at us
if [ -d ./proto ]; then
  rm -rf ./proto
fi

git clone https://github.com/sparkswap/relayer-proto.git ./proto
rm -rf ./proto/.git

# If the build is local, then we will copy related files for dev usage
# for a local SimNet network
if [ "$ARG" == "local" ]; then
  echo "Copying env simnet local file to .env"
  cp ./.env-simnet-local-sample ./.env
  echo "Copying dev file to 'docker-compose.override.yml'"
  cp ./docker-compose.dev.yml ./docker-compose.override.yml
# If the build is not local AND the override exists for whatever reason,
# we should delete the file to not mess w/ the build
elif [ -f docker-compose.override.yml ]; then
  echo "Deleting local docker-compose.override.yml file"
  rm -f ./docker-compose.override.yml
fi

# If we want to build images with the command then we can use
if [ "$ARG" != "no-docker" ]; then
  echo "Building broker docker images"
  EXTERNAL_ADDRESS=$EXTERNAL_ADDRESS npm run build-images
fi
