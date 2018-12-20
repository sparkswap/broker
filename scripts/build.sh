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

# Generate certs for the CLI
rm -rf ./certs
mkdir -p ./certs

# Set paths for self-signed key pair
KEY_PATH="./certs/broker-rpc-tls.key"
CERT_PATH="./certs/broker-rpc-tls.cert"
CSR_PATH="./certs/brokr-rpc-csr.csr"
EXTERNAL_ADDRESS=${EXTERNAL_ADDRESS:-localhost}

openssl ecparam -genkey -name prime256v1 -out $KEY_PATH
openssl req -new -sha256 -key $KEY_PATH -out $CSR_PATH -subj "/CN=$EXTERNAL_ADDRESS/O=sparkswap"
openssl req -x509 -sha256 -days 36500 -key $KEY_PATH -in $CSR_PATH -out $CERT_PATH
rm $CSR_PATH

echo "Building broker docker images"
KEY_PATH=$KEY_PATH CERT_PATH=$CERT_PATH npm run build-images

# We can skip the copying of certs to a local directory if the current build is
# a standalone broker
if [ "$ARG" == "no-cli" ]; then
  rm -rf ./certs
  exit 0
fi

echo "Copying certs"

echo "Making local ~/.sparkswap certs directory"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY/certs

echo "Copying certs to local certs directory"
cp $CERT_PATH $DIRECTORY/certs/broker-rpc-tls.cert

# Clean certs directory after use
rm -rf ./certs
