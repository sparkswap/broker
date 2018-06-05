#!/usr/bin/env bash

##########################################
# This file contains logic to add confirmations to a simnet blockchain
##########################################

set -e -u

echo "Generating 5 confirmation blocks"

GENERATE_CMD='btcctl --simnet --rpcuser="$RPC_USER" --rpcpass="$RPC_PASS" --rpccert="$RPC_CERT" generate 5'
docker-compose exec -T btcd /bin/sh -c "$GENERATE_CMD"
