#!/usr/bin/env bash

################################################
# sparkswapd initialization script
################################################

set -ex

echo "Starting sparkswapd"
./broker-daemon/bin/sparkswapd
