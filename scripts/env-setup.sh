#!/usr/bin/env bash

################################################
# Generates and sets environment variables for broker
#
################################################
RED='\033[0;31m'
NC='\033[0m'

FILE=".env"
if [ -f $FILE ]; then
   echo -e "${RED}$FILE already exists, you can edit it manually if you need to make changes.${NC}"
   echo ""
   exit 1
fi
# Set the network in the .env file based on user input
echo "Enter the network:"
echo "m - MainNet"
echo "t - TestNet"
read NETWORK

if [ $NETWORK = 'm' ]; then
  cp .env-mainnet-sample .env
elif [ $NETWORK = 't' ]; then
  cp .env-testnet-sample .env
else
  echo "$NETWORK is not a valid option for network"
  exit 1
fi

# Set the external btc/ltc addresses in the .env file based on user public IP address
echo "Enter your public IP address:"
read IP_ADDRESS

OS=`uname`
if [ "$OS" = 'Darwin' ]; then
  # for MacOS
  sed -i '' -e "s/^EXTERNAL_BTC_ADDRESS.*/EXTERNAL_BTC_ADDRESS=$IP_ADDRESS/" .env
  sed -i '' -e "s/^EXTERNAL_LTC_ADDRESS.*/EXTERNAL_LTC_ADDRESS=$IP_ADDRESS/" .env
else
  # for Linux and Windows
  sed -i'' -e "s/^EXTERNAL_BTC_ADDRESS.*/EXTERNAL_BTC_ADDRESS=$IP_ADDRESS/" .env
  sed -i'' -e "s/^EXTERNAL_LTC_ADDRESS.*/EXTERNAL_LTC_ADDRESS=$IP_ADDRESS/" .env
fi

array=(BTC_RPC_USER
BTC_RPC_PASS
LTC_RPC_USER
LTC_RPC_PASS
RPC_USER
RPC_PASS)


# Generate and set username/passwords for engines and broker rpc
for i in "${array[@]}"
do
   string=$(base64 < /dev/urandom | tr -d 'O0Il1+\:/' | head -c 24)
   if [ "$OS" = 'Darwin' ]; then
     # for MacOS
     sed -i '' -e "s/^$i.*/$i=$string/" .env
   else
     # for Linux and Windows
     sed -i'' -e "s/^$i.*/$i=$string/" .env
   fi
done
