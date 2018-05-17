#!/usr/bin/env bash

##########################################
#
# This file contains logic to fund a wallet on SIMNET w/ the default LND setup for a broker-daemon.
#
# Information in this script is based off the LND docker setup:
# https://github.com/lightningnetwork/lnd/tree/master/docker
#
# NOTE: This script is incomplete because of the `--noencryptwallet` flag that is
#       included in the lnd_btc container. If this flag was removed, we would need to
#       create a wallet w/ pass and nmemonic
#
##########################################

set -e -u

# Hit the kcli endpoint to generate a new wallet address
echo "Generating new wallet address through KCLI"

WALLET_ADDR=$(./bin/kcli deposit)

# Restart the btcd container w/ the mining-address for our account
echo "Restarting BTCD with the generated wallet address"

docker-compose rm btcd
MINING_ADDRESS=$WALLET_ADDR docker-compose up -d btcd

# Take a wallet address and fund it with some simnet BTC
echo "Generating blocks to be mined w/ supplied wallet address"

GENERATE_CMD='btcctl --simnet --rpcuser="$RPC_USER" --rpcpass="$RPC_PASS" --rpccert="$RPC_CERT" generate 400'
docker-compose exec -T btcd /bin/sh -c "$GENERATE_CMD"

echo "Waiting 5 seconds for segwit response..."

sleep 5

# Check segwit to make sure we are A-OK
SEGWIT_CMD='btcctl --simnet --rpcuser="$RPC_USER" --rpcpass="$RPC_PASS" --rpccert="$RPC_CERT" getblockchaininfo'
RAW_SEGWIT_RESPONSE=$(docker-compose exec -T btcd /bin/sh -c "$SEGWIT_CMD")
SEGWIT_RESPONSE=$(node ./setup/parse-lnd-response.js segwit $RAW_SEGWIT_RESPONSE)

echo "Segwit Response: $SEGWIT_RESPONSE"

echo "Checking wallet balance (NOT IMPLEMENTED YET)"
