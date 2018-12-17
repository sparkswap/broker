#!/bin/sh
echo "Making directory"
DIRECTORY=~/.sparkswap
mkdir -p $DIRECTORY

if [ ! -f "$DIRECTORY/sparkswap.js" ]; then
  echo "Copying sparkswap-sample.js to ~/.sparkswap/sparkswap.js"
  cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-sparkswap.js\" ~/.sparkswap/
else
  echo "Config file already exists, you can override it with your sample file by running:"
  echo "cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-sparkswap.js\" ~/.sparkswap/"
fi
