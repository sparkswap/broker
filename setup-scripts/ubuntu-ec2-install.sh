########################################################
# Sparkswap hosted broker installation for an AWS Ubuntu 16.04 LTS EC2 instance
#
# After `ubuntu-ec2-setup.sh` has been ran on your current machine, we are now able
# to install the broker.
#
# Requirements for this script to work include:
# - Docker permissions for non-root user
# - Docker
# - Docker-compose
# - NodeJS (nvm)
#
# PARAMS:
#   - EXTERNAL_ADDRESS (required, public IP of remote host)
########################################################
set -ex

EXTERNAL_ADDRESS=${EXTERNAL_ADDRESS:-}

if [ -z "$EXTERNAL_ADDRESS" ]; then
  echo "EXTERNAL_ADDRESS is required to install broker on a remote host"
  exit 1
fi

echo "Installing Broker on: $EXTERNAL_ADDRESS"

# Installing the broker
mkdir -p ~/sparkswap && cd sparkswap

# Download the source for a Lightning Network engine
git clone git://github.com/sparkswap/lnd-engine.git
(cd lnd-engine && npm run build)

# Download the source for a broker
git clone git://github.com/sparkswap/broker.git
cd broker
npm run build
cp .env-testnet-sample .env
sed -i "s/sample.ip.address/$EXTERNAL_ADDRESS/" .env
docker-compose up -d

# Install the CLI for local use
npm install -g ./broker-cli
