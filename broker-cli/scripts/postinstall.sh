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
echo "${CYAN}You can also enable autocompletion of Sparkswap CLI.${NC}"
echo ""
echo "${CYAN}If your favorite shell is bash, run the below command:${NC}"
echo "echo \"source <(sparkswap completion bash)\" >> ~/.bashrc && source ~/.bashrc"
echo ""
echo "${CYAN}To do it on zsh, run the below command:${NC}"
echo "echo \"source <(sparkswap completion zsh)\" >> ~/.zshrc && source ~/.zshrc"
echo ""
