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

# Given the information from the previous script (create-wallet) we will now take
# a wallet address and fund it with some fake money on simnet
#
# If WALLET_ADDR is not provided, the script will error out
WALLET_ADDR=${WALLET_ADDR}

# Restart the btcd container w/ the mining-address for our account
btcd --simnet --txindex --rpcuser=$RPC_USER --rpcpass=kek --mining-address
btcctl --simnet --rpcuser=kek --rpcpass=kek generate 400

# wait a little bit
sleep(5)

# Check segwit to make sure we are A-OK
SEGWIT_RESPONSE=$(btcctl --simnet --rpcuser=kek --rpcpass=kek getblockchaininfo | grep -A 1 segwit)

# Check our balance to see if the account is funded.
BALANCE_CMD="lncli --tlscertpath="$TLS_CERT_PATH" --rpcserver=localhost:10101 --macaroonpath="$ADMIN_MACAROON" walletbalance"
RAW_BALANCE=$(docker-compose exec lnd_btc /bin/sh -c "$BALANCE_CMD")

echo "Balance $RAW_BALANCE"
