#!/usr/bin/env bash

##################################################################
#
# Builds a broker image from scratch
#
# NOTE: This functionality requires the use of an ssh key that has read access to
#       the lnd-engine repository.
#       * see https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/ for ssh key creation
#       * see https://blog.github.com/2015-06-16-read-only-deploy-keys/ for read-only deploy key (single repo)
#
# Params:
#   - RELAYER_BRANCH (defaults to master)
#   - LND_ENGINE_BRANCH (defaults to master)
#   - RELAYER_COMMIT_SHA (defaults to the master branch commit sha) (This overrides RELAYER_BRANCH)
#   - LND_ENGINE_COMMIT_SHA (defaults to the master branch commit sha) (This overrides LND_ENGINE_BRANCH)
#
##################################################################

set -e -u

GITHUB_KEY_PATH=${GITHUB_PRIVATE_KEY_PATH:-~/.ssh/id_rsa}

# Sets the branchs that we will use for grabbing a commit-sha from
# each repository
RELAYER_BRANCH=${RELAYER_BRANCH:-master}
LND_ENGINE_BRANCH=${LND_ENGINE_BRANCH:-master}

# We now grab the commit-shas related to the branches set above. These will
# be used if the user has no specificed a specific commit-sha to be used in
# image creation
#
# TODO: The lnd-engine github url will need to change once the repos
# become public.
#
# Example:
# git://github.com/sparkswap/lnd-engine (public)
# git@github.com:sparkswap/lnd-engine (private, designated by ampersand and colon)
#
CURRENT_RELAYER_PROTO_COMMIT_SHA=`git ls-remote git://github.com/sparkswap/relayer-proto | grep "refs/heads/$RELAYER_BRANCH$" | cut -f 1`
CURRENT_LND_ENGINE_COMMIT_SHA=`git ls-remote git@github.com:sparkswap/lnd-engine.git | grep "refs/heads/$LND_ENGINE_BRANCH$" | cut -f 1`

# If the user has specified a COMMIT_SHA to be used for image creation, then
# we will use that, otherwise we will default to the master branch's commit sha
# OR a user provided branch.
#
RELAYER_PROTO_COMMIT_SHA=${RELAYER_COMMIT_SHA:-$CURRENT_RELAYER_PROTO_COMMIT_SHA}
LND_ENGINE_COMMIT_SHA=${LND_ENGINE_COMMIT_SHA:-$CURRENT_LND_ENGINE_COMMIT_SHA}

# NOTE: The names specified with `-t` directly map to the service names in
# the applicable services docker-compose file
docker build -t sparkswap_sparkswapd -f ./docker/sparkswapd/Dockerfile ./  \
  --build-arg SSH_PRIVATE_KEY="$(cat $GITHUB_KEY_PATH)" \
  --build-arg RELAYER_PROTO_COMMIT_SHA=$RELAYER_PROTO_COMMIT_SHA \
  --build-arg LND_ENGINE_COMMIT_SHA=$LND_ENGINE_COMMIT_SHA
