#!/bin/bash

set -e

echo ""
echo "It's time to get all setup and stuff!"
echo ""

DEFAULT_NETWORK_NAME='kinesis-exchange'
ROOT_DIR=$HOME/workspace/broker

echo "Cleaning directories and recreating lnd-engine"

# Clean the lnd-engine dir and recreate it
rm -rf $ROOT_DIR/docker/lnd-engine
mkdir -p $ROOT_DIR/docker/lnd-engine

# Copy all files from LND Engine to docker
cp -rf $ROOT_DIR/node_modules/lnd-engine/docker/* $ROOT_DIR/docker/lnd-engine

echo "Starting all containers"

# Steps for success:
# - down all containers
# - build images
# - up all containers for the broker
docker-compose down
docker-compose build --force-rm

(cd $ROOT_DIR && docker-compose up -d)
(cd $ROOT_DIR/docker/lnd-engine && docker-compose -p broker up -d)
