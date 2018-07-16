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

# The broker/lnd-engine github urls will need to change once the repos
# become public.
# Example:
# git://github.com/kinesis-exchange/broker (public)
# git@github.com:kinesis-exchange/broker (private, designated by ampersand and colon)
BROKER_COMMIT_SHA=`git ls-remote git@github.com:kinesis-exchange/broker.git | grep refs/heads/master | cut -f 1`
RELAYER_PROTO_COMMIT_SHA=`git ls-remote git://github.com/kinesis-exchange/relayer-proto | grep refs/heads/master | cut -f 1`
LND_ENGINE_COMMIT_SHA=`git ls-remote git@github.com:kinesis-exchange/lnd-engine.git | grep refs/heads/master | cut -f 1`

# NOTE: The names specified with `-t` directly map to the service names in
# the applicable services docker-compose file
docker build -t kinesis_kbd ./docker/kbd/ \
  --build-arg SSH_PRIVATE_KEY="$(cat $GITHUB_KEY_PATH)" \
  --build-arg BROKER_COMMIT_SHA=$BROKER_COMMIT_SHA \
  --build-arg RELAYER_PROTO_COMMIT_SHA=$RELAYER_PROTO_COMMIT_SHA \
  --build-arg LND_ENGINE_COMMIT_SHA=$LND_ENGINE_COMMIT_SHA
