#!/usr/bin/env bash

##########################################
#
# This file is a super work in-progress but contains all the steps to perform
# a bitcoin transfer w/ LND
#
# This is based off of information here: https://github.com/lightningnetwork/lnd/tree/master/docker
#
##########################################

set -e

docker exec -it ln

# Run the "Alice" container and log into it:
docker-compose run -d --name alice lnd_btc

# Generate a new backward compatible nested p2sh address for Alice:
ALICE_ADDRESS=$(docker exec -it alice lncli newaddress np2wkh | python parse_lnd.py address)

exit 1

echo "Exported Alice's address: $ALICE_ADDRESS"
