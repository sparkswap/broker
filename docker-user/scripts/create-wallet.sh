#!/usr/bin/env bash

##########################################
#
# This file contains logic to create a wallet w/ the default LND setup for a broker.
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

# lncli command to run against the lnd_btc container
LNCLI_COMMAND='lncli --tlscertpath="$TLS_CERT_PATH" --rpcserver=localhost:10101 --macaroonpath="$ADMIN_MACAROON" newaddress np2wkh'

# Executes the command and stores the output from the lnd_btc container
RAW_WALLET_ADDR=$(docker-compose exec lnd_btc /bin/sh -c "$LNCLI_COMMAND")

# parses the response into a string that we can use in other scripts
WALLET_ADDR=$(node ./scripts/parse-lnd.js wallet $RAW_WALLET_ADDR)

echo "Exported wallet address: $WALLET_ADDR"
