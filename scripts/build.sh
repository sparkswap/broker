#!/usr/bin/env bash

################################################
# Build script for sparkswapd
#
# Options:
# -c, --no-cli                    do not copy certs for local cli installation
# -d, --no-docker                 do not build docker images
# -e=, --external-address=        your public IP address (removes prompt)
# -i, --no-identity               does not generate keys for the daemons identity
# -n, --no-certs                  does not re-generate tls certs for the daemon
#
################################################

set -eu

echo "                                                   "
echo "  ██████  ██▓███   ▄▄▄       ██▀███   ██ ▄█▀  ██████  █     █░ ▄▄▄       ██▓███  ";
echo "▒██    ▒ ▓██░  ██▒▒████▄    ▓██ ▒ ██▒ ██▄█▒ ▒██    ▒ ▓█░ █ ░█░▒████▄    ▓██░  ██▒";
echo "░ ▓██▄   ▓██░ ██▓▒▒██  ▀█▄  ▓██ ░▄█ ▒▓███▄░ ░ ▓██▄   ▒█░ █ ░█ ▒██  ▀█▄  ▓██░ ██▓▒";
echo "  ▒   ██▒▒██▄█▓▒ ▒░██▄▄▄▄██ ▒██▀▀█▄  ▓██ █▄   ▒   ██▒░█░ █ ░█ ░██▄▄▄▄██ ▒██▄█▓▒ ▒";
echo "▒██████▒▒▒██▒ ░  ░ ▓█   ▓██▒░██▓ ▒██▒▒██▒ █▄▒██████▒▒░░██▒██▓  ▓█   ▓██▒▒██▒ ░  ░";
echo "▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░ ▒▒   ▓▒█░░ ▒▓ ░▒▓░▒ ▒▒ ▓▒▒ ▒▓▒ ▒ ░░ ▓░▒ ▒   ▒▒   ▓▒█░▒▓▒░ ░  ░";
echo "░ ░▒  ░ ░░▒ ░       ▒   ▒▒ ░  ░▒ ░ ▒░░ ░▒ ▒░░ ░▒  ░ ░  ▒ ░ ░    ▒   ▒▒ ░░▒ ░     ";
echo "░  ░  ░  ░░         ░   ▒     ░░   ░ ░ ░░ ░ ░  ░  ░    ░   ░    ░   ▒   ░░       ";
echo "      ░                 ░  ░   ░     ░  ░         ░      ░          ░  ░         ";
echo "                                                                                 ";

# Setting this env is ONLY required for a hosted broker setup.
#
# This address is used during the build process so that certs can be generated
# correctly for a hosted (remote) broker daemon.
RELAYER_PROTO_VERSION='master'

# parse options
NO_CLI="false"
NO_DOCKER="false"
NO_CERTS="false"
NO_IDENTITY="false"
EXTERNAL_ADDRESS="localhost"
for i in "$@"
do
case $i in
    -c|--no-cli)
    NO_CLI="true"

    ;;
    -d|--no-docker)
    NO_DOCKER="true"

    ;;
    -e=*|--external-address=*)
    EXTERNAL_ADDRESS="${i#*=}"

    ;;
    -i|--no-identity)
    NO_IDENTITY="true"

    ;;
    -n|--no-certs)
    NO_CERTS="true"

    ;;
    *)
            # unknown option
    ;;
esac
done

if [ "$EXTERNAL_ADDRESS" == "" ]; then
  echo "Please provide your public IP address or hostname"
  read EXTERNAL_ADDRESS
fi

echo ""
echo "It's time to BUILD! All resistance is futile."
echo ""

echo "Checking broker.proto file for issues"
npm run broker-proto

echo "Downloading relayer proto files"
# Blow away proto directory and recreate or git-clone will yell at us
if [ -d ./proto ]; then
  rm -rf ./proto
fi

git clone -b ${RELAYER_PROTO_VERSION} https://github.com/sparkswap/relayer-proto.git ./proto
rm -rf ./proto/.git

#############################################
# Keypair Generation for SSL to the broker
#
# This step creates certs to allow a user to host a broker on a remote machine
# and have connections to their daemon be secured through ssl
#
# Primary use is TLS between Broker-CLI and Broker Daemon
#
#############################################

DIRECTORY=~/.sparkswap
if [ ! -d "$DIRECTORY" ]; then
  echo "Creating directory $DIRECTORY"
  mkdir -p $DIRECTORY
fi

if [[ ! -d "$DIRECTORY/certs" ]]; then
  echo "Creating directory $DIRECTORY/certs"

  mkdir -p $DIRECTORY/certs
fi

KEY_PATH=~/.sparkswap/certs/broker-rpc-tls.key
CERT_PATH=~/.sparkswap/certs/broker-rpc-tls.cert
CSR_PATH=~/.sparkswap/certs/broker-rpc-csr.csr

if [[ -f "$KEY_PATH" ]]; then
  echo "WARNING: TLS Private Key already exists at $KEY_PATH for Broker Daemon. Skipping cert generation"
elif [[ -f "$CERT_PATH" ]]; then
  echo "WARNING: TLS Cert already exists at $CERT_PATH for Broker Daemon. Skipping cert generation"
elif [ "$NO_CERTS" != "true" ]; then
  echo "Generating TLS certs for Broker Daemon"

  openssl ecparam -genkey -name prime256v1 -out $KEY_PATH
  openssl req -new -sha256 -key $KEY_PATH -out $CSR_PATH \
    -reqexts SAN \
    -extensions SAN \
    -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:$EXTERNAL_ADDRESS,DNS:localhost")) \
    -subj "/CN=$EXTERNAL_ADDRESS/O=sparkswap"
  openssl req -x509 -sha256 -key $KEY_PATH -in $CSR_PATH -out $CERT_PATH -days 36500 \
    -reqexts SAN \
    -extensions SAN \
    -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:$EXTERNAL_ADDRESS,DNS:localhost"))

  rm -f $CSR_PATH
fi

#############################################
# Keypair Generation of Broker Identity for Relayer
#
# This step creates certs to allow the broker to authenticate/auth for all actions
# on the relayer
#
# We use a "Secure key exchange algorithm" (ECDH) here because these keys are exchanged
# via a non secure channel.
#
#############################################
ID_PRIV_KEY=~/.sparkswap/certs/broker-identity.private.pem
ID_PUB_KEY=~/.sparkswap/certs/broker-identity.public.pem

if [[ -f "$ID_PRIV_KEY" ]]; then
  echo "WARNING: ID already exists for Broker Daemon. Skipping ID generation"
elif [[ -f "$ID_PUB_KEY" ]]; then
  echo "WARNING: ID Public Key already exists for Broker Daemon. Skipping ID generation"
elif [ "$NO_IDENTITY" != "true" ]; then
  openssl ecparam -name prime256v1 -genkey -noout -out $ID_PRIV_KEY
  openssl ec -in $ID_PRIV_KEY -pubout -out $ID_PUB_KEY
fi

if [ "$NO_DOCKER" == "false" ]; then
  # NOTE: The names specified with `-t` directly map to the service names in
  # the applicable services docker-compose file
  echo "Building broker docker images"
  docker build -t sparkswap_sparkswapd -f ./docker/sparkswapd/Dockerfile ./
fi

if [ -f docker-compose.override.yml ]; then
  # Let the user know that an override file exists which may mean that the user
  # will have settings they do not expect
  echo ""
  echo "WARNING: A 'docker-compose.override.yml' file exists"
  echo "WARNING: This may add unwanted settings to the broker that could affect how your daemon runs."
  echo ""
fi
