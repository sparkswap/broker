#!/bin/sh

echo "Successfully installed ☍ Kinesis Broker CLI (kcli)!"
echo ""
echo "To set up your custom configuration for kcli, copy 'sample-.kcli.js' to your home directory as '.kcli.js'."
echo ""
echo "To do this now, run the below (in bash):"
echo "cp -n \"$(dirname $(which kcli))/../lib/node_modules/broker-cli/sample-.kcli.js\" ~/.kcli.js"
echo ""