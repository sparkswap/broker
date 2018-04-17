#!/usr/bin/env bash

# exit from script if error was raised.
set -e

# Generate certs
# https://github.com/mably/lncli-web#generate-lnd-certificates-compatible-with-nodejs-grpc
# Enter the Lnd home directory, located by default at ~/.lnd on Linux or
# /Users/[username]/Library/Application Support/Lnd/ on Mac OSX
# $APPDATA/Local/Lnd on Windows. Also change '/CN=localhost/O=lnd' to '//CN=localhost\O=lnd' if you are using Git Bash.

cd /secure/
openssl ecparam -genkey -name prime256v1 -out tls.key
openssl req -new -sha256 -key tls.key -out csr.csr -subj '/CN=lnd_btc/O=lnd'
openssl req -x509 -sha256 -days 36500 -key tls.key -in csr.csr -out tls.cert
rm csr.csr

# Remove macaroons if they exist so that they can be recreated w/ LND
rm -f /secure/*.macaroon

exec lnd \
    --adminmacaroonpath=/secure/admin.macaroon \
    --readonlymacaroonpath=/secure/readonly.macaroon \
    --tlscertpath=/secure/tls.cert \
    --tlskeypath=/secure/tls.key \
    --rpclisten=$RPC_LISTEN \
    --listen=$LISTEN \
    --restlisten=$REST_LISTEN \
    --datadir=$DATA_DIR \
    --logdir=$LOG_DIR \
    --debuglevel=$DEBUG \
    --$CHAIN.$NETWORK \
    --$CHAIN.active \
    --$CHAIN.node=$NODE \
    --$NODE.rpcuser=$RPCPASS \
    --$NODE.rpcpass=$RPCUSER
