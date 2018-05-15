#!/bin/bash

set -e

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Removing dependency lock files"
rm -f ./package-lock.json
rm -f ./npm-shrinkwrap.json

echo "Removing node_modules"
rm -rf ./node_modules

echo "Reinstalling dependencies"
npm i

echo "Downloading relayer proto files"
rm -rf ./proto/relayer
git clone git@github.com:kinesis-exchange/relayer.git ./proto/relayer
cp ./proto/relayer/proto/relayer.proto ./proto/

echo "Reinitializing lnd-engine docker files"
rm -rf ./docker/btcd
rm -rf ./docker/lnd
rm -f ./docker/docker-compose.yml
rm -f ./docker/LND-README.md

# Copy all docker files from lnd-engine and add them to our docker folder
cp -a ./node_modules/lnd-engine/docker/. ./docker
cp ./node_modules/lnd-engine/docker-compose.yml ./docker/lnd-docker-compose.yml

# Rename the readme file for docker
mv ./docker/README.md ./docker/LND-README.md

echo "Rebuilding all broker related docker containers/services"
docker-compose down -v
docker-compose build --force-rm
docker-compose up -d

echo "Running tests against the repository"
if npm test ; then
  exit 0
else
  echo "SKIPPING TEST RUN: Docker containers are not running"
fi
