#!/usr/bin/env bash

##################################################################
#
# Builds a broker image from scratch
#
# NOTE: This functionality requires the use of an ssh key that has read access to the broker
#       and lnd-engine repositories.
#       * see https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/ for ssh key creation
#       * see https://blog.github.com/2015-06-16-read-only-deploy-keys/ for read-only deploy key (single repo)
#
##################################################################

set -e -u

GITHUB_KEY_PATH=${GITHUB_PRIVATE_KEY_PATH:-~/.ssh/id_rsa}

# NOTE: The names specified with `-t` directly map to the service names in
# the applicable services docker-compose file
docker build -t kinesis_kbd ./docker/kbd/ --build-arg SSH_PRIVATE_KEY="$(cat $GITHUB_KEY_PATH)" --no-cache
