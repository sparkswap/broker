#!/bin/bash

set -e

# Rebuild C++ modules for docker target and locally
npm rebuild grpc
npm rebuild leveldown

./bin/kbd