#!/bin/bash

set -e

echo "Downloading Relayer cert..."
curl -o /secure/relayer-root.pem "${RELAYER_CERT_HOST}/cert" || exit 1

./broker-daemon/bin/kbd
