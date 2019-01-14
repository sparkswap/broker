#!/usr/bin/env bash

################################################
# Build script for sparkswapd
#
# Params:
# - EXTERNAL_ADDRESS (optional, for hosted daemons)
################################################

set -eu

# Setting this env is ONLY required for a hosted broker setup.
#
# This address is used during the build process so that certs can be generated
# correctly for a hosted (remote) broker daemon.
EXTERNAL_ADDRESS=${EXTERNAL_ADDRESS:-}
RELAYER_PROTO_VERSION='v0.2.2-beta'

ARG=${1:-false}

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Reinstalling dependencies"
npm install --quiet

echo "Checking broker.proto file for issues"
npm run broker-proto

echo "Downloading relayer proto files"
# Blow away proto directory and recreate or git-clone will yell at us
if [ -d ./proto ]; then
  rm -rf ./proto
fi

git clone -b ${RELAYER_PROTO_VERSION} https://github.com/sparkswap/relayer-proto.git ./proto
rm -rf ./proto/.git

echo "Generating certificates for RPC"

#############################################
# Keypair Generation for SSL to the broker
#
# This step creates certs to allow a user to host a broker on a remote machine
# and have connections to their daemon be secured through ssl
#
# Primary use is TLS between Broker-CLI and Broker Daemon
#
#############################################
rm -rf ./certs
mkdir -p ./certs

# Set paths for self-signed key pair
KEY_PATH="./certs/broker-rpc-tls.key"
CERT_PATH="./certs/broker-rpc-tls.cert"
CSR_PATH="./certs/broker-rpc-csr.csr"
EXTERNAL_ADDRESS=${EXTERNAL_ADDRESS:-localhost}

openssl ecparam -genkey -name prime256v1 -out $KEY_PATH

openssl req -new -sha256 -key $KEY_PATH -out $CSR_PATH \
  -reqexts SAN \
  -extensions SAN \
  -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:${EXTERNAL_ADDRESS},DNS:localhost")) \
  -subj "/CN=$EXTERNAL_ADDRESS/O=sparkswap"

openssl req -x509 -sha256 -key $KEY_PATH -in $CSR_PATH -out $CERT_PATH -days 36500 \
  -reqexts SAN \
  -extensions SAN \
  -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:${EXTERNAL_ADDRESS},DNS:localhost")) \

rm $CSR_PATH

#############################################
# Keypair Generation for Relayer
#
# This step creates certs to allow the broker to authenticate/auth for orders
# on the relayer
#
# We use a "Secure key exchange algorithm" here because these keys are exchanged
# via a non secure channel. (ECDH)
#
#############################################

ID_PRIV_KEY='./certs/broker-identity.private.pem'
ID_PUB_KEY='./certs/broker-identity.public.pem'

RUN openssl ecparam -name prime256v1 -genkey -noout -out ${ID_PRIV_KEY}
RUN openssl ec -in ${ID_PRIV_KEY} -pubout -out ${ID_PUB_KEY}

echo "Building broker docker images"
if [ "$ARG" == "no-docker" ]; then
  KEY_PATH=$KEY_PATH CERT_PATH=$CERT_PATH npm run build-images
fi

if [ -f docker-compose.override.yml ]; then
  # Let the user know that an override file exists which may mean that the user
  # will have settings they do not expect
  echo ""
  echo "WARNING: A 'docker-compose.override.yml' file exists"
  echo "WARNING: This may add unwanted settings to the broker that could effect how your daemon runs."
  echo ""
fi

# We can skip the copying of certs to a local directory if the current build is
# a standalone broker
if [ "$ARG" == "no-cli" ]; then
  exit 0
fi

echo "Making local ~/.sparkswap certs directory"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY/certs

echo "Copying certs to local certs directory"
cp $CERT_PATH $DIRECTORY/certs/broker-rpc-tls.cert
