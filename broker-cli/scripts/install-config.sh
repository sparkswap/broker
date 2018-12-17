#!/bin/sh
echo "Making directory"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY
echo "Copying sparkswap-sample.js to ~/.sparkswap/sparkswap.js"
cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-sparkswap.js\" ~/.sparkswap/sparkswap.js
