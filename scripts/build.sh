#!/bin/bash

set -e

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

# Download the relayer proto
rm -rf ./proto/relayer
git clone git@github.com:kinesis-exchange/relayer.git ./proto/relayer
cp ./proto/relayer/proto/relayer.proto ./proto/

npm test
