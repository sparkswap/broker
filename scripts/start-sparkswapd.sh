#!/usr/bin/env bash

################################################
# sparkswapd initialization script
#
# IMPORTANT: This file is only for use inside of the sparkswapd docker container
#            as `/secure` is a volume inside of the container
################################################

set -eu

# We set value defaults here to mimic the behaivor of docker-compose in-case
# this script is called outside of docker-compose
DATA_DIR=${DATA_DIR:-""}
NETWORK=${NETWORK:-""}
NODE_ENV=${NODE_ENV:-""}
RPC_ADDRESS=${RPC_ADDRESS:-""}
RPC_USER=${RPC_USER:-""}
RPC_PASS=${RPC_PASS:-""}
RPC_PUB_KEY=${RPC_PUB_KEY:-""}
RPC_PRIV_KEY=${RPC_PRIV_KEY:-""}
ID_PRIV_KEY=${ID_PRIV_KEY:-""}
ID_PUB_KEY=${ID_PUB_KEY:-""}
RELAYER_RPC_HOST=${RELAYER_RPC_HOST:-""}
RELAYER_CERT_PATH=${RELAYER_CERT_PATH:-""}

# For each parameter, we must check if the string is blank, because docker-compose
# will automatically assign a blank string to the value and CLI validations will fail
PARAMS=""

if [ ! -z "$DATA_DIR" ]; then
  PARAMS="$PARAMS --data-dir=$DATA_DIR"
fi

if [ ! -z "$NETWORK" ]; then
  PARAMS="$PARAMS --network=$NETWORK"
fi

if [ ! -z "$NODE_ENV" ]; then
  PARAMS="$PARAMS --environment=$NODE_ENV"
fi

if [ ! -z "$ID_PUB_KEY" ]; then
  PARAMS="$PARAMS --id-pub-key-path=$ID_PUB_KEY"
fi

if [ ! -z "$ID_PRIV_KEY" ]; then
  PARAMS="$PARAMS --id-priv-key-path=$ID_PRIV_KEY"
fi

if [ ! -z "$RELAYER_RPC_HOST" ]; then
  PARAMS="$PARAMS --relayer.rpc-host=$RELAYER_RPC_HOST"
fi

if [ ! -z "$RELAYER_CERT_PATH" ]; then
  PARAMS="$PARAMS --relayer.cert-path=$RELAYER_CERT_PATH"
fi

if [ ! -z "$RPC_ADDRESS" ]; then
  PARAMS="$PARAMS --rpc.address=$RPC_ADDRESS"
fi

if [ ! -z "$RPC_HTTP_PROXY_ADDRESS" ]; then
  PARAMS="$PARAMS --rpc.http-proxy-address=$RPC_HTTP_PROXY_ADDRESS"
fi

if [ ! -z "$RPC_USER" ]; then
  PARAMS="$PARAMS --rpc.user=$RPC_USER"
fi

if [ ! -z "$RPC_PASS" ]; then
  PARAMS="$PARAMS --rpc.pass=$RPC_PASS"
fi

if [ ! -z "$RPC_PUB_KEY" ]; then
  PARAMS="$PARAMS --rpc.pub-key-path=$RPC_PUB_KEY"
fi

if [ ! -z "$RPC_PRIV_KEY" ]; then
  PARAMS="$PARAMS --rpc.priv-key-path=$RPC_PRIV_KEY"
fi

echo "Starting sparkswapd"
exec ./broker-daemon/bin/sparkswapd $PARAMS "$@"
