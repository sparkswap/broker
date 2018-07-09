#!/bin/bash

set -e

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Reinstalling dependencies"
npm i

echo "Building broker proto files"
rm -rf ./broker-daemon/proto/broker.proto
npm run broker-proto

echo "Downloading relayer proto files"
rm -rf ./proto/relayer
git clone git@github.com:kinesis-exchange/relayer-proto.git ./proto/relayer
cp ./proto/relayer/relayer.proto ./proto/
rm -rf ./proto/relayer

echo "Installing lnd-engine"
git clone git@github.com:kinesis-exchange/lnd-engine.git ./node_modules/lnd-engine

# Remove git file or npm will complain
rm -rf ./node_modules/lnd-engine/.git
