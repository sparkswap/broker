#!/usr/bin/env bash

# exit from script if error was raised.
set -e

PARAMS=$(echo \
    "--$NETWORK" \
    --rpccert="/rpc/rpc.cert" \
    --rpcserver="rpcserver" \
    "--rpcuser=$RPCUSER" \
    "--rpcpass=$RPCPASS"
)

exec btcctl $PARAMS \
    "$@"
