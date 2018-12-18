#!/bin/sh

echo "Successfully installed Ϟ SparkSwap Broker CLI (sparkswap)!"
echo ""
echo "To set up your custom configuration for the SparkSwap CLI, copy 'sample-.sparkswap.js' to your home directory as '.sparkswap.js'."
echo ""
echo "To do this now, run the below (in bash):"
echo "cp -n \"$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-.sparkswap.js\" ~/.sparkswap.js"
echo ""
echo "You can also enable autocompletion of Sparkswap CLI."
echo ""
echo "If your favorite shell is bash, run the below command:"
echo "echo \"source <(sparkswap completion bash)\" >> ~/.bashrc && source ~/.bashrc"
echo ""1:
echo "To do it on zsh, run the below command:"
echo "echo \"source <(sparkswap completion zsh)\" >> ~/.zshrc && source ~/.zshrc"

echo ""