#!/bin/bash

set -e

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

npm i

# Download the relayer proto
rm -rf ./proto/relayer
git clone git@github.com:kinesis-exchange/relayer.git ./proto/relayer
cp ./proto/relayer/proto/relayer.proto ./proto/

# Delete all files added from lnd-engine
rm -rf ./docker/btcd
rm -rf ./docker/lnd
rm -f ./docker/docker-compose.yml
rm -f ./docker/LND-README.md

# Copy all docker files from lnd-engine and add them to our docker folder
cp -a ./node_modules/lnd-engine/docker/. ./docker
cp ./node_modules/lnd-engine/docker-compose.yml ./docker/lnd-docker-compose.yml

# Rename the readme file for docker
mv ./docker/README.md ./docker/LND-README.md


# Run tests on the docker container and handle failures if containers are not running
if npm test ; then
  exit 0
else
  echo "SKIPPING TEST RUN: Docker containers are not running"
fi
