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

rm -f /secure/*.macaroon

# error function is used within a bash function in order to send the error
# message directly to the stderr output and exit.
error() {
    echo "$1" > /dev/stderr
    exit 0
}

# return is used within bash function in order to return the value.
return() {
    echo "$1"
}

# set_default function gives the ability to move the setting of default
# env variable from docker file to the script thereby giving the ability to the
# user override it durin container start.
set_default() {
    # docker initialized env variables with blank string and we can't just
    # use -z flag as usually.
    BLANK_STRING='""'

    VARIABLE="$1"
    DEFAULT="$2"

    if [[ -z "$VARIABLE" || "$VARIABLE" == "$BLANK_STRING" ]]; then

        if [ -z "$DEFAULT" ]; then
            error "You should specify default variable"
        else
            VARIABLE="$DEFAULT"
        fi
    fi

   return "$VARIABLE"
}

# Set default variables if needed.
RPCUSER=$(set_default "$RPCUSER" "devuser")
RPCPASS=$(set_default "$RPCPASS" "devpass")
DEBUG=$(set_default "$DEBUG" "debug")
NETWORK=$(set_default "$NETWORK" "simnet")
CHAIN=$(set_default "$CHAIN" "bitcoin")
BACKEND="btcd"
if [[ "$CHAIN" == "litecoin" ]]; then
    BACKEND="ltcd"
fi

# --tlscertpath=/.lnd/tls.cert \
# --tlskeypath=/.lnd/tls.key \

exec lnd \
    --noencryptwallet \
    --tlscertpath=/secure/tls.cert \
    --tlskeypath=/secure/tls.key \
    --logdir="/data" \
    --rpclisten=0.0.0.0 \
    --adminmacaroonpath=/secure/admin.macaroon \
    --readonlymacaroonpath=/secure/readonly.macaroon \
    "--$CHAIN.active" \
    "--$CHAIN.$NETWORK" \
    "--$CHAIN.node"="btcd" \
    "--$BACKEND.rpccert"="/rpc/rpc.cert" \
    "--$BACKEND.rpchost"="blockchain" \
    "--$BACKEND.rpcuser"="$RPCUSER" \
    "--$BACKEND.rpcpass"="$RPCPASS" \
    --debuglevel="$DEBUG" \
    "$@"
