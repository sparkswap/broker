#!/usr/bin/env bash

#################################
# Install Engines, the Broker and Broker CLI
#
# Options:
# -y, --yes                     answer "Yes" to all yes/no prompts to allow for non-interactive scripting
# -n=, --network=[network]      'm' for MainNet, 'r' for RegTest hosted by Sparkswap (removes prompt)
# -b, --build                   build the images locally instead of pulling from dockerhub
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

BROKER_VERSION="v0.5.2-beta"

# Set the minimum to approx. 6 months prior
MIN_DOCKER_VERSION=18.09.0
MIN_DOCKER_COMPOSE_VERSION=1.23.0

# For current versions, don't include patches
CURRENT_DOCKER_VERSION=18.09
CURRENT_DOCKER_COMPOSE_VERSION=1.24

# print a message with a color, like msg "my message" $GRAY
msg () {
  echo -e "${GRAY}${TAG}${NC}:  $2$1${NC}"
}

# Compares two versions using dot notation (e.g. 1.2.3 < 1.2.4)
compare_versions () {
  if [[ $1 == $2 ]]
  then
    return 0
  fi
  local IFS=.
  local i ver1=($1) ver2=($2)
  # fill empty fields in ver1 with zeros
  for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
  do
    ver1[i]=0
  done
  for ((i=0; i<${#ver1[@]}; i++))
  do
    if [[ -z ${ver2[i]} ]]
    then
      # fill empty fields in ver2 with zeros
      ver2[i]=0
    fi
    if ((10#${ver1[i]} > 10#${ver2[i]}))
    then
      return 1
    fi
    if ((10#${ver1[i]} < 10#${ver2[i]}))
    then
      return 2
    fi
  done
  return 0
}

# parse options
FORCE_YES="false"
NETWORK=""
BUILD="false"
for i in "$@"
do
case $i in
    -y|--yes)
    FORCE_YES="true"

    ;;
    -n=*|--network=*)
    NETWORK="${i#*=}"

    ;;
    -b|--build)
    BUILD="true"

    ;;
    *)
            # unknown option
    ;;
esac
done

echo ""
echo "  :DMMMMMMM:                                                                   "
echo " MMMMMMMMM&MM:                              MM                                 "
echo "MMMMMMD  MMMMM      MMM  MMNMM   MMM:  MM=M MM  MM  MMM MM  MM  MM MMM:  MMNMM "
echo "MMMMM   MMMMMMM    MM,   MM  :M   ,:MM MM   MMMM   MM,   M ,MM  M   ,:MM MM  :M"
echo "MMMMMM   NMMMMM      +MM MM   M MM  MM MM   MM MM    +MM MMM NMM& MM  MM MM   M"
echo "MMMMM  ,MMMMMM     MMMM  MMMMM   MMMMM MM   MM  MM MMMM   MM  MM   MMMMM MMMMM "
echo " MMIMMMMMMMMM:           MM                                              MM    "
echo "   \`MMMMMM+                                                                   "
echo "                                                          https://sparkswap.com"
echo ""
echo "Sparkswap Installer starting..."
echo ""
echo ""

# Check if Docker is installed. Fail install if not
if [ "$(command -v docker)" == "" ]; then
  msg "Docker is not installed." $RED
  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    # Get the version of Linux distribution
    LINUX_DISTRO=$(cat /etc/*-release | grep -E '^ID=' | sed 's/^.*=//' | tr -d \")
    msg "Looks like you're using Linux." $GREEN
    msg "To install Docker using the convenience script for Linux, run" $GREEN
    msg "    $ curl -fsSL https://get.docker.com -o get-docker.sh" $WHITE
    msg "    $ sudo sh get-docker.sh" $WHITE
    msg "Alternatively, you can follow Docker's installation steps for Linux (https://docs.docker.com/install/linux/docker-ce/$(echo $LINUX_DISTRO)/)" $GREEN
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    msg "Looks like you're using Mac." $GREEN
    msg "You can use the following link to download and install Docker for Mac Version 2.0.0.3 or greater (this installs Docker Community Edition and Docker Compose)" $GREEN
    msg "https://docs.docker.com/docker-for-mac/release-notes/#docker-community-edition-2003-2019-02-15" $WHITE
  else
    msg "Please install Docker before continuing." $GREEN
  fi
  exit 1
fi

# Ensure version of Docker meets minimum requirements. Fail install if not
DOCKER_VERSION=$(docker version | grep Version | head -n 1 | grep -oE '[.0-9]*$')
compare_versions $DOCKER_VERSION $MIN_DOCKER_VERSION
if [[ $? == 2 ]]; then
  msg "Your version of Docker ($DOCKER_VERSION) is older than the minimum required version. Please upgrade to version $CURRENT_DOCKER_VERSION or greater." $RED

  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    # Get the version of Linux distribution
    LINUX_DISTRO=$(cat /etc/*-release | grep -E '^ID=' | sed 's/^.*=//' | tr -d \")
    msg "You can find steps to upgrade Docker for Linux using the following link." $WHITE
    msg "https://docs.docker.com/install/linux/docker-ce/$(echo $LINUX_DISTRO)/" $WHITE
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    msg "You can find steps to upgrade Docker for Mac using the following link." $WHITE
    msg "https://docs.docker.com/docker-for-mac/release-notes/" $WHITE
  fi

  exit 1
fi

# Check if running the latest version of Docker. Warn if not and continue with install
compare_versions $DOCKER_VERSION $CURRENT_DOCKER_VERSION
if [[ $? == 2 ]]; then
  msg "Your version of Docker ($DOCKER_VERSION) isn't up to date. It's recommended that you upgrade to version $CURRENT_DOCKER_VERSION or greater." $YELLOW

  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    # Get the version of Linux distribution
    LINUX_DISTRO=$(cat /etc/*-release | grep -E '^ID=' | sed 's/^.*=//' | tr -d \")
    msg "You can find steps to upgrade Docker for Linux using the following link." $WHITE
    msg "https://docs.docker.com/install/linux/docker-ce/$(echo $LINUX_DISTRO)/" $WHITE
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    msg "You can find steps to upgrade Docker for Mac using the following link." $WHITE
    msg "https://docs.docker.com/docker-for-mac/release-notes/" $WHITE
  fi
fi

# Check if Docker Compose is installed. Fail install if not
if [ "$(command -v docker-compose)" == "" ]; then
  msg "Docker Compose is not installed." $RED
  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    msg "To install Docker Compose using Linux, run" $GREEN
    msg '    $ curl -L "https://github.com/docker/compose/releases/download/1.23.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose' $WHITE
    msg "    $ sudo chmod +x /usr/local/bin/docker-compose" $WHITE
    msg "Alternatively, you can follow Docker's installation steps for Linux (https://docs.docker.com/compose/install/)" $GREEN
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    msg "Looks like you're using Mac." $GREEN
    msg "You can use the following link to install Docker Compose for Mac." $GREEN
    msg "https://docs.docker.com/compose/install/" $WHITE
  else
    msg "Please install Docker Compose before continuing" $RED
  fi
  exit 1
fi

# Ensure version of Docker Compose meets minimum requirements. Fail install if not
DOCKER_COMPOSE_VERSION=$(docker-compose version | grep 'docker-compose version' | sed 's/,.*//' | grep -oE '[.0-9]*$')
compare_versions $DOCKER_COMPOSE_VERSION $MIN_DOCKER_COMPOSE_VERSION
if [[ $? == 2 ]]; then
  msg "Your version of Docker Compose ($DOCKER_COMPOSE_VERSION) is older than the minimum required version. Please upgrade to version $CURRENT_DOCKER_COMPOSE_VERSION or greater." $RED

  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    msg "You can find steps to upgrade Docker Compose for Linux using the following link." $WHITE
    msg "https://docs.docker.com/compose/install/" $WHITE
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    msg "You can find steps to upgrade Docker for Mac using the following link." $WHITE
    msg "https://docs.docker.com/docker-for-mac/release-notes/" $WHITE
  fi

  exit 1
fi

# Check if running the latest version of Docker Compose. Warn if not and continue with install
compare_versions $DOCKER_COMPOSE_VERSION $CURRENT_DOCKER_COMPOSE_VERSION
if [[ $? == 2 ]]; then
  msg "Your version of Docker Compose ($DOCKER_COMPOSE_VERSION) isn't up to date. It's recommended you upgrade to version $CURRENT_DOCKER_COMPOSE_VERSION or greater." $YELLOW

  if [[ "$OSTYPE" == "linux-gnu" ]]; then
    msg "You can find steps to upgrade Docker Compose for Linux using the following link." $WHITE
    msg "https://docs.docker.com/compose/install/" $WHITE
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    msg "You can find steps to upgrade Docker for Mac using the following link." $WHITE
    msg "https://docs.docker.com/docker-for-mac/release-notes/" $WHITE
  fi
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

# Install Broker
msg "Installing the Sparkswap Broker (sparkswapd)" $WHITE
if [ -d "broker" ]; then
  msg "You already have a folder for the broker. Skipping" $YELLOW
  msg "If you need to re-install, remove the folder and try again." $YELLOW
else

  # Download the Broker and extract it
  curl -L "https://github.com/sparkswap/broker/archive/${BROKER_VERSION}.tar.gz" -o "broker-${BROKER_VERSION}.tar.gz"
  mkdir broker
  tar -xzf "broker-${BROKER_VERSION}.tar.gz" -C broker --strip-components=1
  rm "broker-${BROKER_VERSION}.tar.gz"

  # Move into the Broker directory to build it
  cd broker

  if [[ $BUILD == "true" ]]; then
    # Build images locally for the broker
    bash ./scripts/build.sh
  else
    # Run the broker build to generate certs and identity, but do not build
    # docker images
    bash ./scripts/build.sh --no-docker
  fi

  # Move back a directory to the `sparkswap` root
  cd ..
fi

# Install LND Engine
if [[ "$BUILD" == "true" ]]; then
  msg "Installing LND Engine (BTC and LTC support)" $WHITE

  if [ -d "lnd-engine" ]; then
    msg "You already have a folder for the lnd-engine. Skipping." $YELLOW
    msg "If you need to re-install, remove the folder and try again." $YELLOW
  else
    # Detect LND-Engine version
    msg "Detecting LND Version from the Broker" $WHITE
    LND_ENGINE_VERSION=$(sed -n 's/.*github:sparkswap\/lnd-engine#\(.*\)".*/\1/p' package.json)
    msg "Found LND Engine version $LND_ENGINE_VERSION" $GREEN

    # Download the LND Engine and extract it
    curl -L "https://github.com/sparkswap/lnd-engine/archive/${LND_ENGINE_VERSION}.tar.gz" -o "lnd-engine-${LND_ENGINE_VERSION}.tar.gz"
    mkdir lnd-engine
    tar -xzf "lnd-engine-${LND_ENGINE_VERSION}.tar.gz" -C lnd-engine --strip-components=1
    rm "lnd-engine-${LND_ENGINE_VERSION}.tar.gz"

    # Build images locally for the lnd-engine
    (cd lnd-engine && bash ./scripts/build.sh)
  fi
fi

# Moving back to the broker directory
cd broker

# Set up environment
msg "Setting up your Broker" $WHITE
bash ./scripts/env-setup.sh -n=$NETWORK

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
msg "All done with installation!" $GREEN
msg "Go into your container with ${NC}${BLUE}docker-compose exec sparkswapd bash${NC}" $WHITE
msg "And run ${NC}${BLUE}sparkswap healthcheck${NC}${WHITE} to see how things are looking." $WHITE
