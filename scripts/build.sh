#!/usr/bin/env bash

################################################
# Build script for sparkswapd
#
# Options:
# -c, --no-cli                    do not copy certs for local cli installation
# -d, --no-docker                 do not build docker images
# -e=, --external-address=        your public IP address (used for cert generation)
# -i, --no-identity               does not generate keys for the daemons identity
# -n, --no-certs                  does not re-generate tls certs for the daemon
# -l, --local                     run the build script for development
# -f, --force-certs               forces the generation tls certs for the daemon
#
################################################

set -eu


echo ""
echo "    ▄▄██████▄▄                              ▄▄                                "
echo "  ▄██████████▀█▄                            ██                                "
echo " ████████▀▀ ▄████    ▄███▄ ████▄  ████▄ ███ ██  ██ ▄███▄ ██ ██ ██ ████▄ ████▄ "
echo "█████▀    ▄███████   ██    ██  ██     █ ██▀ ████▀  ██    ██▄██▄██     █ ██  ██"
echo "██████▄    ▀██████   ▀███▄ ██  ██ ▄████ ██  ████   ▀███▄  ██████  ▄████ ██  ██"
echo "███████▀    ▄█████      ██ ██  ██ ██  █ ██  ██ ██     ██  ▀██ █▀  ██  █ ██  ██"
echo " ████▀ ▄▄████████    ▀███▀ ████▀  █████ ██  ██  ██ ▀███▀   ██ █   █████ ████▀ "
echo "  ▀█▄██████████▀           ██                                           ██    "
echo "    ▀▀██████▀▀             ▀▀                                           ▀▀    "
echo "                                                         https://sparkswap.com"
echo ""
echo "Broker Build starting..."
echo ""
echo ""

# The directory where we store the sparkswap configuration, certs, and keys.
SPARKSWAP_DIRECTORY=~/.sparkswap

# parse options
NO_CLI="false"
NO_DOCKER="false"
NO_CERTS="false"
NO_IDENTITY="false"
FORCE_CERTS="false"

# Setting this env is ONLY required for a hosted broker setup.
#
# This address is used during the build process so that certs can be generated
# correctly for a hosted (remote) broker daemon.
EXTERNAL_ADDRESS="localhost"
LOCAL="false"
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
    -l|--local)
    LOCAL="true"

    ;;
    -f|--force-certs)
    FORCE_CERTS="true"

    ;;
    *)
            # unknown option
    ;;
esac
done

if [ "$EXTERNAL_ADDRESS" == "" ]; then
  EXTERNAL_ADDRESS="localhost"
fi

# Create an openssl docker image if the command does not exist
if [ "$(command -v openssl)" == "" ]; then
  echo "WARNING: openssl is not installed, using a Docker image instead."

  if [ "$NO_DOCKER" == "false" ]; then
    echo "Building openssl docker image"
    docker build -t sparkswap/openssl -f ./docker/openssl/Dockerfile ./
  fi

  alias openssl="docker run sparkswap/openssl"
fi

#############################################
# Keypair Generation for SSL to the broker
#
# This step creates certs to allow a user to host a broker on a remote machine
# and have connections to their daemon be secured through ssl
#
# Primary use is TLS between Broker-CLI and Broker Daemon
#
#############################################

echo "Creating directories $SPARKSWAP_DIRECTORY and $SPARKSWAP_DIRECTORY/secure"
mkdir -p $SPARKSWAP_DIRECTORY/secure

KEY_PATH=$SPARKSWAP_DIRECTORY/secure/broker-rpc-tls.key
CERT_PATH=$SPARKSWAP_DIRECTORY/secure/broker-rpc-tls.cert
CSR_PATH=$SPARKSWAP_DIRECTORY/secure/broker-rpc-csr.csr

# We want to fail out if the user has both cert flags set in the script
if [[ "$FORCE_CERTS" == "true" ]] && [[ "$NO_CERTS" == "true" ]]; then
  echo "ERROR: You cannot have --force-certs and --no-certs enabled at the same time"
  exit 0
fi

# If we force the cert creation, we'll simply remove the certs from the sparkswap
# directory, and then regenerate them below
if [[ "$FORCE_CERTS" == "true" ]]; then
  echo "Removing existing Broker TLS certs: --force-certs set to true"
  rm -f $KEY_PATH
  rm -f $CERT_PATH
fi

if [[ -f "$KEY_PATH" ]]; then
  echo "WARNING: TLS Private Key already exists at $KEY_PATH for Broker Daemon. Skipping cert generation"
elif [[ -f "$CERT_PATH" ]]; then
  echo "WARNING: TLS Cert already exists at $CERT_PATH for Broker Daemon. Skipping cert generation"
elif [ "$NO_CERTS" != "true" ]; then
  echo "Generating TLS certs for Broker Daemon"

  openssl ecparam -genkey -name prime256v1 > $KEY_PATH
  openssl req -new -sha256 -key $KEY_PATH \
    -reqexts SAN \
    -extensions SAN \
    -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:$EXTERNAL_ADDRESS,DNS:localhost")) \
    -subj "/CN=$EXTERNAL_ADDRESS/O=sparkswap" > $CSR_PATH
  openssl req -x509 -sha256 -key $KEY_PATH -in $CSR_PATH -days 36500 \
    -reqexts SAN \
    -extensions SAN \
    -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:$EXTERNAL_ADDRESS,DNS:localhost")) > $CERT_PATH

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

ID_PRIV_KEY=$SPARKSWAP_DIRECTORY/secure/broker-identity.private.pem
ID_PUB_KEY=$SPARKSWAP_DIRECTORY/secure/broker-identity.public.pem

if [[ -f "$ID_PRIV_KEY" ]]; then
  echo "WARNING: ID already exists for Broker Daemon. Skipping ID generation"
elif [[ -f "$ID_PUB_KEY" ]]; then
  echo "WARNING: ID Public Key already exists for Broker Daemon. Skipping ID generation"
elif [ "$NO_IDENTITY" != "true" ]; then
  openssl ecparam -name prime256v1 -genkey -noout > $ID_PRIV_KEY
  openssl ec -in $ID_PRIV_KEY -pubout > $ID_PUB_KEY
fi

if [ "$LOCAL" == "true" ]; then
  # When running locally we can rely on our local proto files from the Relayer
  echo "Downloading relayer proto files"
  # Blow away proto directory and recreate or git-clone will yell at us
  if [ -d ./proto ]; then
    rm -rf ./proto
  fi

  # Using anything other than "master" is unsupported since this repository does
  # not correctly pick up all Relayer changes and only changes that affect the proto
  # files themselves.
  RELAYER_PROTO_VERSION='master'

  # Note: this will override the proto files in version control. You should not commit changes
  # to these files unless it is part of the change you are making to the Broker.
  git clone -b ${RELAYER_PROTO_VERSION} https://github.com/sparkswap/relayer-proto.git ./proto
  rm -rf ./proto/.git
fi

if [ "$NO_DOCKER" == "false" ]; then
  # NOTE: The names specified with `-t` directly map to the service names in
  # the applicable services docker-compose file
  echo "Building broker docker images"
  BROKER_VERSION=$(awk -F'\"' '/\"version\": \".+\"/{ print $4; exit; }' ./package.json)
  docker build -t sparkswap/broker:$BROKER_VERSION -f ./docker/sparkswapd/Dockerfile ./
fi

if [ "$LOCAL" == "true" ]; then
  echo "Downloading Local Relayer Cert..."
  # the path of this output is directly related to the SECURE_PATH that is set
  # in the .env file
  curl --silent -S --output ~/.sparkswap/secure/relayer-root-regtest-local.pem http://localhost:8080/cert
  echo "Relayer cert downloaded successfully"
fi

