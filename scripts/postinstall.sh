#!/bin/bash

set -e

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

# Download the relayer proto
rm -rf ./proto/relayer
git clone git@github.com:kinesis-exchange/relayer-proto.git ./proto/relayer
cp ./proto/relayer/lib/relayer.proto ./proto/

# Rebuild gRPC for docker target
npm rebuild grpc --target_arch=x64 --target_platform=linux --target_libc=glibc
npm test
