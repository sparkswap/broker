#!/usr/bin/env bash
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'
set -e -u
echo ""
echo "${GREEN}Installing sparkswap config file${NC}"
echo ""

DIRECTORY=~/.sparkswap
echo "${CYAN}Making directory $DIRECTORY${NC}"
mkdir -p $DIRECTORY
echo ""

if [ ! -f "$DIRECTORY/config.js" ]; then
  echo "${CYAN}Copying sample-config.js to ~/.sparkswap/config.js${NC}"
  cp -n $(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-config.js ~/.sparkswap/config.js
else
  echo "${CYAN}Config file already exists, you can override it with your sample file by running:${NC}"
  echo "cp $(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-config.js ~/.sparkswap/config.js"
fi
echo ""
