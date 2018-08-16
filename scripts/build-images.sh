#!/usr/bin/env bash

##################################################################
#
# Builds a broker image from scratch
#
# Params:
#   - EXTERNAL_ADDRESS (optional, defaults to localhost)
#   - RELAYER_PROTO_BRANCH (defaults to master)
#   - RELAYER_COMMIT_SHA (defaults to the master branch commit sha) (This overrides RELAYER_PROTO_BRANCH)
#
##################################################################

set -e -u

CERT_HOST=${EXTERNAL_ADDRESS:-localhost}
RELAYER_PROTO_BRANCH=${RELAYER_PROTO_BRANCH:-master}

# We now grab the commit-shas related to the branches set above. These will
# be used if the user has no specificed a specific commit-sha to be used in
# image creation
#
CURRENT_RELAYER_PROTO_COMMIT_SHA=`git ls-remote git://github.com/sparkswap/relayer-proto | grep "refs/heads/$RELAYER_PROTO_BRANCH$" | cut -f 1`

# If the user has specified a COMMIT_SHA to be used for image creation, then
# we will use that, otherwise we will default to the master branch's commit sha
# OR a user provided branch.
#
RELAYER_PROTO_COMMIT_SHA=${RELAYER_COMMIT_SHA:-$CURRENT_RELAYER_PROTO_COMMIT_SHA}

# NOTE: The names specified with `-t` directly map to the service names in
# the applicable services docker-compose file
docker build -t sparkswap_sparkswapd -f ./docker/sparkswapd/Dockerfile ./  \
  --build-arg CERT_HOST=$CERT_HOST \
  --build-arg RELAYER_PROTO_COMMIT_SHA=$RELAYER_PROTO_COMMIT_SHA \
  --build-arg RELAYER_PROTO_BRANCH=$RELAYER_PROTO_BRANCH
