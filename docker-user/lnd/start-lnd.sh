#!/usr/bin/env bash

# exit from script if error was raised.
set -e

# Generate certs for NodeJS gRPC
# NOTE: "Beware that lnd autogenerated certificates are not compatible with current
# NodeJS gRPC module implementation. Lnd uses the P-521 curve for its certificates
# but NodeJS gRPC module is only compatible with certificates using the P-256 curve"
#
# More info here: https://github.com/mably/lncli-web#generate-lnd-certificates-compatible-with-nodejs-grpc
#
cd $SECURE_DIRECTORY
openssl ecparam -genkey -name prime256v1 -out tls.key
openssl req -new -sha256 -key tls.key -out csr.csr -subj '/CN=lnd_btc/O=lnd'
openssl req -x509 -sha256 -days 36500 -key tls.key -in csr.csr -out tls.cert
rm csr.csr

# Remove macaroons if they exist so that they can be recreated w/ LND
rm -f $SECURE_DIRECTORY/*.macaroon

# USING THIS OPTION BECAUSE WERE BAD
# BUT THIS WILL NEED TO BE REMOVED FOR TESTNET
echo 'LND has --noencryptwallet set. MAKE SURE TO REMOVE THIS'
echo "Using LND w/ env options: CHAIN:$CHAIN NETWORK:$NETWORK NODE:$NODE"

exec lnd \
    --noencryptwallet \
    --adminmacaroonpath=/secure/admin.macaroon \
    --readonlymacaroonpath=/secure/readonly.macaroon \
    --tlscertpath=/secure/tls.cert \
    --tlskeypath=/secure/tls.key \
    --rpclisten="$RPC_LISTEN" \
    --listen="$LISTEN" \
    --restlisten="$REST_LISTEN" \
    --datadir="$DATA_DIR" \
    --logdir="$LOG_DIR" \
    "--$CHAIN.$NETWORK" \
    "--$CHAIN.active" \
    "--$CHAIN.node"="$NODE" \
    "--$NODE.rpccert"="$RPC_CERT_PATH" \
    "--$NODE.rpchost"="$RPC_HOST" \
    "--$NODE.rpcuser"="$RPC_USER" \
    "--$NODE.rpcpass"="$RPC_PASS" \
    --debuglevel="$DEBUG" \
    "$@"
