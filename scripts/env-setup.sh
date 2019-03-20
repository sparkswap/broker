#!/usr/bin/env bash

##########################################################
# Generates and sets environment variables for broker
#
# Options:
# -n=, --network=[network] 'm' for MainNet, 'r' for Sparkswap's Hosted RegTest (removes prompt)
# -i=, --public-ip=[ip address] Your public IP Address (removes prompt)
#
##########################################################
RED='\033[0;31m'
NC='\033[0m'

# parse options
NETWORK=""
IP_ADDRESS=""
for i in "$@"
do
case $i in
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

FILE=".env"
if [ -f $FILE ]; then
   echo -e "${RED}$FILE already exists, you can edit it manually if you need to make changes.${NC}"
   echo ""
   exit 1
fi
# Set the network in the .env file based on user input

if [ "$NETWORK" == "" ]; then
  echo "Enter the network:"
  echo "m - MainNet"
  echo "r - Sparkswap's Hosted Regtest"
  read NETWORK
fi

if [ $NETWORK = 'm' ]; then
  cp .env-mainnet-sample .env
elif [ $NETWORK = 'r' ]; then
  cp .env-regtest-sample .env
else
  echo "$NETWORK is not a valid option for network"
  exit 1
fi

# Set the external btc/ltc addresses in the .env file based on user public IP address
if [ "$IP_ADDRESS" == "" ]; then
  echo "Enter your public IP address:"
  read IP_ADDRESS
fi

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
