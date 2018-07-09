#!/usr/bin/env bash

set -e -u

# NOTE: The names specified with `-t` directly map to the service names in
# the applicable services docker-compose file
docker build -t kinesis_kbd ./docker/kbd/ --build-arg SSH_PRIVATE_KEY="$(cat ~/.ssh/id_rsa)"
