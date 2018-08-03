#!/usr/bin/env bash

##################################################################
# Starts the broker docker stack on testnet
##################################################################

set -e -u

docker-compose -f docker-compose.prod.yml -f docker-compose.testnet.yml up -d
