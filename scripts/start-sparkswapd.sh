#!/usr/bin/env bash

################################################
# sparkswapd initialization script
#
# IMPORTANT: This file is only for use inside of the sparkswapd docker container
#            as `/secure` is a volume inside of the container
################################################

set -e

echo "Downloading Relayer cert..."
curl -o /secure/relayer-root.pem "${RELAYER_CERT_HOST}/cert" || exit 1

./broker-daemon/bin/sparkswapd
