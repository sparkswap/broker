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

SYMBOL=${SYMBOL:-BTC}
RELAYER_DIR=${RELAYER_DIR:-../relayer}

# TODO: differentiate between lnd and other engines
echo "Grabbing engine public key from broker"

CONFIG=$(docker-compose exec -T kbd bash -c './broker-cli/bin/kcli config')
DESTINATION_PUB_KEY=$(node ./scripts/parse-broker-response.js pubkey $CONFIG)

# Restart the btcd container w/ the mining-address for our account
echo "Running funding script on the relayer w/ wallet addr"

(cd $RELAYER_DIR && ADDR="$DESTINATION_PUB_KEY" SYMBOL=BTC bash ./scripts/fund-simnet-wallet.sh)

echo "Waiting 10 seconds for blocks to be confirmed"
sleep 10

echo "Checking wallet balance"
./broker-cli/bin/kcli wallet balance
