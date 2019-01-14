#!/usr/bin/env bash

##################################################################
# Builds a broker image from scratch
##################################################################

set -e -u

# NOTE: The names specified with `-t` directly map to the service names in
# the applicable services docker-compose file
docker build -t sparkswap_sparkswapd -f ./docker/sparkswapd/Dockerfile ./
