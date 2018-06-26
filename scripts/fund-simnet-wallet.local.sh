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
echo "Generating new deposit address through KCLI"

WALLET_ADDR=$(./broker-cli/bin/kcli wallet new-deposit-address)

# Restart the btcd container w/ the mining-address for our account
echo "Running funding script on the relayer w/ wallet addr"

(cd ../relayer && WALLET_ADDR="$WALLET_ADDR" bash ./scripts/fund-simnet-wallet.sh)

echo "Waiting 10 seconds for blocks to be confirmed"
sleep 10

echo "Checking wallet balance"
./broker-cli/bin/kcli wallet balance
