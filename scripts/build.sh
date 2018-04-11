#!/bin/bash

set -e

echo ""
echo "It's time to build! All resistance is futile."
echo ""

LND_PROTO_URL=${LND_PROTO_URL:-https://raw.githubusercontent.com/lightningnetwork/lnd/master/lnrpc/rpc.proto}
RELAYER_PROTO_URL=${RELAYER_PROTO_URL:-https://raw.githubusercontent.com/kinesis-exchange/relayer-proto/master/lib/relayer.proto}

# Downloads the LND proto file
curl -o ./proto/lnd-rpc.proto $LND_PROTO_URL
curl -o ./proto/relayer.proto $RELAYER_PROTO_URL

# Prepares the downloaded lnd-rpc proto file (installation steps tell you to remove this line)
# (this is POSIX compliant as the versions of sed differ between OSes)
sed 's|^import \"google/api/annotations.proto\";||' ./proto/lnd-rpc.proto > /tmp/file.$$ && mv /tmp/file.$$ ./proto/lnd-rpc.proto

# Rest of the installation process
npm i
npm test
