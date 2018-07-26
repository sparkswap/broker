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
git clone https://github.com/sparkswap/relayer-proto.git ./proto
