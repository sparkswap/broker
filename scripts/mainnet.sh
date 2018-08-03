#!/usr/bin/env bash

##################################################################
# Starts the broker docker stack on mainnet
##################################################################

set -e -u

docker-compose -f docker-compose.prod.yml -f docker-compose.mainnet.yml up -d
