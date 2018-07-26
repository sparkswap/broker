#!/bin/bash

set -e

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Reinstalling dependencies"
npm i

echo "Checking broker.proto file for issues"
npm run broker-proto

echo "Downloading relayer proto files"
rm -rf ./proto/relayer
git clone git@github.com:sparkswap/relayer-proto.git ./proto/relayer
cp ./proto/relayer/relayer.proto ./proto/
rm -rf ./proto/relayer

echo "Installing lnd-engine"
git clone git@github.com:sparkswap/lnd-engine.git ./node_modules/lnd-engine

# Remove git file or npm will complain
rm -rf ./node_modules/lnd-engine/.git
