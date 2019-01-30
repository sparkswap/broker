#!/usr/bin/env bash

#################################
# Install Engines, the Broker and Broker CLI
#
# Options:
# -y, --yes                     answer "Yes" to all yes/no prompts to allow for non-interactive scripting
# -n=, --network=[network]      'm' for MainNet, 't' for TestNet (removes prompt)
# -i=, --public-ip=[ip address] Your public IP Address (removes prompt)
#
#################################

# Note: we don't set -u because we're sourcing from scripts (e.g. .bashrc) that may not be as strict.
set -e

TAG='[⚡ Sparkswap Installer]'
WHITE='\033[1;37m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

LND_ENGINE_VERSION="v0.3.0-beta"
BROKER_VERSION="v0.3.3-beta"

# print a message with a color, like msg "my message" $GRAY
msg () {
  echo -e "${GRAY}${TAG}${NC}:  $2$1${NC}"
}

# parse options
FORCE_YES="false"
NETWORK=""
IP_ADDRESS=""
for i in "$@"
do
case $i in
    -y|--yes)
    FORCE_YES="true"

    ;;
    -n=*|--network=*)
    NETWORK="${i#*=}"

    ;;
    -i=*|--public-ip=*)
    IP_ADDRESS="${i#*=}"

    ;;
    *)
            # unknown option
    ;;
esac
done

msg "You're about to install Sparkswap. Good for you!" $GREEN

# Source nvm 🤢
test -f ~/.nvm/nvm.sh && . ~/.nvm/nvm.sh
test -f ~/.profile && . ~/.profile
test -f ~/.bashrc && . ~/.bashrc
if [ "$(command -v brew)" != "" ]; then
  test -f "$(brew --prefix nvm)/nvm.sh" && . "$(brew --prefix nvm)/nvm.sh" --no-use
fi

# Ensure nvm is installed
if [ "$(command -v nvm)" == "" ]; then
  msg "nvm is not installed. Please install it before continuing." $RED
  exit 1
fi

# Install node.js 8.11
msg "Installing node.js@8.11" $WHITE
nvm install 8.11 --latest-npm

if [ "$(command -v docker)" == "" ]; then
  msg "Docker is not installed. Please install it before continuing" $RED
  exit 1
fi

if [ "$(command -v docker-compose)" == "" ]; then
  msg "Docker Compose is not installed. Please install it before continuing" $RED
  exit 1
fi

msg "We're about to create a directory named 'sparkswap' in ${PWD}." $WHITE

if [ "$FORCE_YES" == "true" ]; then
  dirok="y"
else
  msg "Is that ok? [Y/n]" $WHITE
  read dirok
  dirok=$(echo $dirok | tr '[:upper:]' '[:lower:]') # lowercase
  if [[ -z $dirok ]]; then
    dirok="y" # default if they push enter
  fi
fi

case $dirok in
  y|ye|yes)
    mkdir -p sparkswap && cd sparkswap
    ;;
  *)
    msg "Goodbye" $YELLOW || exit 0
    ;;
esac

# Install LND Engine
msg "Installing LND Engine (BTC and LTC support)" $WHITE
if [ -d "lnd-engine" ]; then
  msg "You already have a folder for the lnd-engine. Skipping." $YELLOW
  msg "If you need to re-install, remove the folder and try again." $YELLOW
else
  git clone -b "$LND_ENGINE_VERSION" --single-branch --depth 1 https://github.com/sparkswap/lnd-engine.git
  (cd lnd-engine && npm run build)
fi

# Install Broker
msg "Installing the Sparkswap Broker (sparkswapd)" $WHITE
if [ -d "broker" ]; then
  msg "You already have a folder for the broker. Skipping" $YELLOW
  msg "If you need to re-install, remove the folder and try again." $YELLOW
  cd broker
else
  git clone -b "$BROKER_VERSION" --single-branch --depth 1 https://github.com/sparkswap/broker.git
  cd broker
  npm run build -- -e=$IP_ADDRESS
fi

# Set up environment
msg "Setting up your Broker" $WHITE
npm run env-setup -- -n=$NETWORK -i=$IP_ADDRESS

# Install CLI
msg "Installing the CLI" $WHITE
npm install -g ./broker-cli
(cd $(dirname $(which sparkswap))/../lib/node_modules/broker-cli && npm run install-config)

msg "Creating random username and password" $WHITE
## Re-do this step so we can copy into the config
array=(RPC_USER:rpcUser
  RPC_PASS:rpcPass)

# Generate and set username/passwords for broker rpc
for i in "${array[@]}"
do
  string=$(base64 < /dev/urandom | tr -d 'O0Il1+\:/' | head -c 24)
  IFS=':' read -ra PARTS <<< "$i"

  # the js file needs a comma on the first line, but not the second
  ENDOFLINE=""
  if [ "${PARTS[0]}" == "RPC_USER" ]; then
    ENDOFLINE=","
  fi

  if [ $(uname) = 'Darwin' ]; then
    # for MacOS
    sed -i '' -e "s/^${PARTS[0]}.*/${PARTS[0]}=$string/" .env
    sed -i '' -e "s/${PARTS[1]}.*/${PARTS[1]}: '$string'${ENDOFLINE}/" ~/.sparkswap/config.js
  else
    # for Linux and Windows
    sed -i'' -e "s/^${PARTS[0]}.*/${PARTS[0]}=$string/" .env
    sed -i'' -e "s/${PARTS[1]}.*/${PARTS[1]}: '$string'${ENDOFLINE}/" ~/.sparkswap/config.js
  fi
done

# Start the broker
msg "Starting the Broker" $WHITE
docker-compose up -d

echo ""
echo ""
msg "All done with installation! Try \`${NC}${BLUE}sparkswap healthcheck${NC}${GREEN}\` to see how things are looking." $GREEN
