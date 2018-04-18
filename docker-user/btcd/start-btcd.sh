#!/usr/bin/env bash

# exit from script if error was raised.
set -e

PARAMS=$(echo \
    "--$NETWORK" \
    "--debuglevel=$DEBUG" \
    "--rpcuser=$RPC_USER" \
    "--rpcpass=$RPC_PASS" \
    "--datadir=/data" \
    "--logdir=/data" \
    "--rpccert=/rpc/rpc.cert" \
    "--rpckey=/rpc/rpc.key" \
    "--rpclisten=0.0.0.0" \
    "--txindex"
)

# Set the mining flag only if address is non empty.
if [[ -n "$MINING_ADDRESS" ]]; then
    PARAMS="$PARAMS --miningaddr=$MINING_ADDRESS"
fi

exec btcd $PARAMS
