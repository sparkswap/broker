#!/usr/bin/env bash
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'


echo "${GREEN}Successfully installed Ϟ SparkSwap Broker CLI (sparkswap)!${NC}"
echo ""
echo "${CYAN}To set up your custom configuration for the SparkSwap CLI, copy 'sample-config.js' to '~/.sparkswap/config.js'.${NC}"
echo ""
echo "${CYAN}To do this now, run the below (in bash):${NC}"
echo "cd $(dirname $(which sparkswap))/../lib/node_modules/broker-cli; npm run install-config"
echo ""
