while true; do
  sparkswap sell 0.0001 59.2 --market btc/ltc
  sleep 1
  sparkswap buy 0.0001 --market btc/ltc --rpc-address localhost:27493
  sleep 1
done
