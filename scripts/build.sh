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
  cp ./.env-simnet-sample ./.env
  echo "Copying dev file to 'docker-compose.override.yml'"
  cp ./docker-compose.simnet.sample.yml ./docker-compose.override.yml
elif [ -f docker-compose.override.yml ]; then
  # Let the user know that an override file exists which may mean that the user
  # will have settings they do not expect
  echo "A 'docker-compose.override.yml' file exists, but you are not using a supported"
  echo "environment: local or regtest"
  echo ""
  echo "WARNING: This may add unwanted settings to the broker that could effect how your daemon runs."
  echo ""
fi

echo "Building broker docker images"
EXTERNAL_ADDRESS=$EXTERNAL_ADDRESS npm run build-images

echo "Copying certs"

echo "Making certs directory"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY/certs

CERT_PATH=/secure/broker-rpc-tls.cert
SPARKSWAPD_ID=$(docker-compose ps -q sparkswapd)

echo "Copying certs to local directory"
docker cp $SPARKSWAPD_ID:$CERT_PATH $DIRECTORY/certs/broker-rpc-tls.cert
