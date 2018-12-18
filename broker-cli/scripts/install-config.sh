#!/usr/bin/env bash
set -e -u
echo ""
echo "Installing sparkswap config file"
echo ""

echo "Making directory $DIRECTORY"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY
echo ""

if [ ! -f "$DIRECTORY/config.js" ]; then
  echo "Copying sparkswap-sample.js to ~/.sparkswap/config.js"
  cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-config.js\" ~/.sparkswap/config.js
else
  echo "Config file already exists, you can override it with your sample file by running:"
  echo "cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-config.js\" ~/.sparkswap/config.js"
fi
echo ""
