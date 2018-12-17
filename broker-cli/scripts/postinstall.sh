#!/bin/sh

# Setup auto-completion for bash
if [-f ~/.bashrc]; then
    echo "source <(sparkswap completion bash)" >> ~/.bashrc && source ~/.bashrc
fi    
# Setup auto-completion for zsh
if [-f ~/.zshrc]; then
    echo "source <(sparkswap completion zsh)" >> ~/.zshrc && source ~/.zshrc
fi    

echo "Successfully installed Ϟ SparkSwap Broker CLI (sparkswap)!"
echo ""
echo "To set up your custom configuration for the SparkSwap CLI, copy 'sample-.sparkswap.js' to your home directory as '.sparkswap.js'."
echo ""
echo "To do this now, run the below (in bash):"
echo "cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-.sparkswap.js\" ~/.sparkswap.js"
echo ""