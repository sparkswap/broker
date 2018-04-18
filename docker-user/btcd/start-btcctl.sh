#!/usr/bin/env bash

# exit from script if error was raised.
set -e

PARAMS=$(echo \
    "--$NETWORK" \
    "--rpccert=$RPC_CERT" \
    "--rpckey=$RPC_KEY" \
    "--rpcuser=$RPCUSER" \
    "--rpcpass=$RPCPASS"
)

exec btcctl $PARAMS \
    "$@"
