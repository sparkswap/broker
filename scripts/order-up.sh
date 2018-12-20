# order time

sparkswap wallet balance
sleep 2
sparkswap wallet balance --rpc-address localhost:27493
sleep 2

echo "Generate addresses"
BTC_ADDR=$(sparkswap wallet new-deposit-address btc)
LTC_ADDR=$(sparkswap wallet new-deposit-address ltc --rpc-address localhost:27493)

(cd ../relayer && printf "%s\n200\n" $BTC_ADDR | npm run fund-simnet-broker btc)
sleep 2
(cd ../relayer && printf "%s\n200\n" $LTC_ADDR | npm run fund-simnet-broker ltc)
sleep 2

sparkswap wallet balance
sleep 2
sparkswap wallet balance --rpc-address localhost:27493
sleep 10

printf "y\n" | sparkswap wallet commit btc --market btc/ltc
sleep 2
printf "y\n" | sparkswap wallet commit ltc --market btc/ltc --rpc-address localhost:27493
sleep 2
