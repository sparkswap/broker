#!/usr/bin/env bash

##########################################
#
# This file contains logic to update a chain to a specific symbol
# host/publickey info for LND.
#
# You can find this information using `docker-compose exec relayer bash -c 'node ./test-client-scripts/test-lnd.js'`
#
##########################################

set -e -u

ENV='DEV'

echo -n "Channel Point: "
read CHANNEL_POINT

echo -n "Desired Symbol: "
read SYMBOL

echo "Updating channel $CHANNEL_POINT to $SYMBOL"

docker-compose exec -T relayer bash -c "node ./scripts/update-channel-chain.js $CHANNEL_POINT $SYMBOL"
