# Recreate "btcd" node and set Alice's address as mining address:
MINING_ADDRESS=$ALICE_ADDRESS docker-compose up -d btcd

# Generate 400 blocks (we need at least "100 >=" blocks because of coinbase
# block maturity and "300 ~=" in order to activate segwit):
docker-compose run btcctl generate 400 >/dev/null

# Check that segwit is active:
IS_ACTIVE=$(docker-compose run btcctl getblockchaininfo | python parse_lnd.py segwit)

echo "Segwit status: $IS_ACTIVE"

if [ $IS_ACTIVE != 'active' ]; then
  exit 1
fi

echo "Waiting for 10 seconds for alice's balance"
sleep 10

# Check alice's balance to see if we are cool
docker exec -it alice lncli walletbalance

# connect bob to alice
docker-compose run -d --name bob lnd_btc

# wait 10 seconds for bob's container to show up
echo "Waiting for 10 seconds while bobs container is starting"
sleep 10

BOBS_PUBLIC_KEY=$(docker exec -it bob lncli getinfo | python parse_lnd.py pubkey)

echo "Bob's pub key: $BOBS_PUBLIC_KEY"

BOBS_IP=$(docker inspect bob | python parse_lnd.py ip)

echo "Bob's IP: $BOBS_IP"

docker exec -it alice lncli connect $BOBS_PUBLIC_KEY@$BOBS_IP

# Check list of peers for both bob and alice?
docker exec -it alice lncli listpeers
docker exec -it bob lncli listpeers

# Open the channel with bob
docker exec -it alice lncli openchannel --node_key=$BOBS_PUBLIC_KEY --local_amt=1000000

echo "Waiting for channel to open"
sleep 10

# Need to figure out why channel is not opening... sheesh

# # Include funding transaction in block
# docker-compose run btcctl generate 3 >/dev/null

# # Check that channel with Bob was opened
# docker exec -it alice lncli listchannels

# # Add an invoice and parse the key
# BOB_PAY_REQ=$(docker exec -it bob lncli addinvoice --amt=10000 | python parse_lnd.py invoice)

# # Have alice pay bob
# docker exec -it alice lncli sendpayment --pay_req=$BOB_PAY_REQ

# # Check the balances of both
# docker exec -it alice channelbalance
# docker exec -it bob channelbalance

# # grab the channel point and close the connection
# TX=$(docker exec -it alice lncli listchannels | python parse_lnd.py fundingtx)
# IDX=$(docker exec -it alice lncli listchannels | python parse_lnd.py idx)

# # Close the channel
# docker exec -it alice lncli closechannel --funding_txid=$TX --output_index=$IDX

# # Include close transaction in block
# docker-compose run btccl generate 3 >/dev/null

# # Check Alice's wallet
# docker exec -it alice lncli walletbalance

# # Check Bob's wallet
# docker exec -it bob lncli walletbalance
