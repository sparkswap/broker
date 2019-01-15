#!/usr/bin/env bash

################################################
# Build script for sparkswapd
#
# Options:
# -c, --no-cli                    do not copy certs for local cli installation
# -d, --no-docker                 do not build docker images
# -e=, --external-address=        your public IP address (removes prompt)
#
################################################

set -eu

# Setting this env is ONLY required for a hosted broker setup.
#
# This address is used during the build process so that certs can be generated
# correctly for a hosted (remote) broker daemon.
EXTERNAL_ADDRESS=${EXTERNAL_ADDRESS:-}
RELAYER_PROTO_VERSION='master'

# parse options
NO_CLI="false"
NO_DOCKER="false"
EXTERNAL_ADDRESS="localhost"
for i in "$@"
do
case $i in
    -c|--no-cli)
    NO_CLI="true"

    ;;
    -d|--no-docker)
    NO_DOCKER="true"

    ;;
    -e=*|--external-address=*)
    EXTERNAL_ADDRESS="${i#*=}"

    ;;
    *)
            # unknown option
    ;;
esac
done

if [ "$EXTERNAL_ADDRESS" == "" ]; then
  echo "Please provide your public IP address"
  read EXTERNAL_ADDRESS
fi

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Reinstalling dependencies"
npm install --quiet

echo "Checking broker.proto file for issues"
npm run broker-proto

echo "Downloading relayer proto files"
# Blow away proto directory and recreate or git-clone will yell at us
if [ -d ./proto ]; then
  rm -rf ./proto
fi

git clone -b ${RELAYER_PROTO_VERSION} https://github.com/sparkswap/relayer-proto.git ./proto
rm -rf ./proto/.git

echo "Building broker docker images"
if [ "$NO_DOCKER" == "false" ]; then
  # NOTE: The names specified with `-t` directly map to the service names in
  # the applicable services docker-compose file
  docker build -t sparkswap_sparkswapd -f ./docker/sparkswapd/Dockerfile ./
fi

if [ -f docker-compose.override.yml ]; then
  # Let the user know that an override file exists which may mean that the user
  # will have settings they do not expect
  echo ""
  echo "WARNING: A 'docker-compose.override.yml' file exists"
  echo "WARNING: This may add unwanted settings to the broker that could effect how your daemon runs."
  echo ""
fi

# We can skip the copying of certs to a local directory if the current build is
# a standalone broker
if [ "$NO_CLI" == "true" ]; then
  exit 0
fi

echo "Making local ~/.sparkswap certs directory"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY/certs

echo "Copying certs to local certs directory"
cp $CERT_PATH $DIRECTORY/certs/broker-rpc-tls.cert
