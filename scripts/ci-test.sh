#!/bin/bash

set -e

git clone git@github.com:kinesis-exchange/lnd-engine.git ./node_modules/lnd-engine
npm run format
npm test
