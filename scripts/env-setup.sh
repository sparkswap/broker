#!/usr/bin/env bash

##########################################################
# Generates and sets environment variables for broker
#
# Options:
# -n=, --network=[network] 'm' for MainNet, 'r' for RegTest hosted by Sparkswap (removes prompt)
#
##########################################################
RED='\033[0;31m'
NC='\033[0m'

# parse options
NETWORK=""
for i in "$@"
do
case $i in
    -n=*|--network=*)
    NETWORK="${i#*=}"

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
  echo "r - RegTest (Hosted by Sparkswap)"
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
