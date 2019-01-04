#!/usr/bin/env bash

# Set the network in the .env file based on user input
echo "Enter the network: 1 for MainNet, 2 for TestNet"
read ADDR
if [ $ADDR = '1' ]; then
  sed -i "" -e "s/.*NETWORK.*/NETWORK=mainnet/" .env
elif [ $ADDR = '2' ]; then
  sed -i "" -e "/NETWORK/c\NETWORK=testnet" .env
else
  echo "$ADDR is not a valid option for network"
  exit 1
fi

# Set the external btc/ltc addresses in the .env file based on user public IP address
echo "Enter your public IP address:"
read IP_ADDRESS

sed -i "" -e "s/^EXTERNAL_BTC_ADDRESS.*/EXTERNAL_BTC_ADDRESS=$IP_ADDRESS/" .env
sed -i "" -e "s/^EXTERNAL_LTC_ADDRESS.*/EXTERNAL_LTC_ADDRESS=$IP_ADDRESS/" .env

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
   sed -i "" -e "s/^$i.*/$i=$string/" .env
done
