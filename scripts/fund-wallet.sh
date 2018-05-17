#!/usr/bin/env bash

##########################################
#
# This file contains logic to fund a wallet w/ the default LND setup for a broker.
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

# Given the information from the previous script (create-wallet) we will now take
# a wallet address and fund it with some fake money on simnet
#
# If WALLET_ADDR is not provided, the script will error out
WALLET_ADDR=${WALLET_ADDR}

# Restart the btcd container w/ the mining-address for our account
docker-compose rm btcd
MINING_ADDRESS=$WALLET_ADDR docker-compose up -d btcd

GENERATE_CMD='btcctl --simnet --rpcuser="$RPC_USER" --rpcpass="$RPC_PASS" --rpccert="$RPC_CERT" generate 400'
docker-compose exec -T btcd /bin/sh -c "$GENERATE_CMD"

# wait a little bit
sleep 10

# Check segwit to make sure we are A-OK
SEGWIT_CMD='btcctl --simnet --rpcuser="$RPC_USER" --rpcpass="$RPC_PASS" --rpccert="$RPC_CERT" getblockchaininfo'
RAW_SEGWIT_RESPONSE=$(docker-compose exec -T btcd /bin/sh -c "$SEGWIT_CMD")
SEGWIT_RESPONSE=$(node ./scripts/parse-lnd.js segwit $RAW_SEGWIT_RESPONSE)

echo "Segwit: $SEGWIT_RESPONSE"
