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
# Params:
#   - SYMBOL (optional, defaults to BTC)
#   - RELAYER_DIR (optional, defaults to `../relayer`)
#
##########################################

set -e -u

SYMBOL=${1:-}

if [[ -z "$SYMBOL" ]]; then
    echo "Must provide a SYMBOL to the fund script" 1>&2
    echo "Example: `npm run fund btc`"
    echo ""
    echo ""
    exit 1
fi

RELAYER_DIR=${RELAYER_DIR:-../relayer}

# TODO: differentiate between lnd and other engines
echo "Grabbing deposit address from broker"

CONFIG=$(docker-compose exec -T kbd bash -c './broker-cli/bin/kcli config')

WALLET_ADDRESS=$(docker-compose exec -T kbd bash -c './broker-cli/bin/kcli wallet new-deposit-address')

# Restart the btcd container w/ the mining-address for our account
echo "Running funding script on the relayer with wallet address: $WALLET_ADDRESS"

(cd $RELAYER_DIR && ADDR=$WALLET_ADDRESS SYMBOL=$SYMBOL bash ./scripts/fund-simnet-wallet.sh)

echo "Waiting 15 seconds for blocks to be confirmed"
sleep 15

echo "Checking wallet balance"
./broker-cli/bin/kcli wallet balance
