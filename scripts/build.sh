#!/bin/bash

set -e

echo ""
echo "It's time to build! All resistance is futile."
echo "WARNING: THIS SCRIPT RUNS IN ALL RELATIVE PATHS"
echo "WARNING: Make sure this was only ran from NPM"
echo ""

# Downloads the LND proto file
LND_PROTO_URL=${LND_PROTO_URL:-https://raw.githubusercontent.com/lightningnetwork/lnd/master/lnrpc/rpc.proto}
curl -o ./proto/lnd-rpc.proto $LND_PROTO_URL

# Clones the relayer repo and copies its relayer.proto file to the
# root of the directory
#
# This works w/ ssh or user/pass
#
git clone git@github.com:kinesis-exchange/relayer-proto.git ./proto/relayer
cp ./proto/relayer/lib/relayer.proto ./proto

# Prepares the downloaded lnd-rpc proto file (installation steps tell you to remove this line)
# (this is POSIX compliant as the versions of sed differ between OSes)
sed 's|^import \"google/api/annotations.proto\";||' ./proto/lnd-rpc.proto > /tmp/file.$$ && mv /tmp/file.$$ ./proto/lnd-rpc.proto

# Rest of the installation process
npm i
npm test
