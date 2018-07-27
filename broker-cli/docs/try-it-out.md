Try it out
==========

## Streaming the orderbook
Run `sparkswap orderbook --market BTC/LTC` to get a live view of the orderbook.

![BTC/LTC Orderbook](./images/sparkswap_orderbook_--market_BTCLTC.gif?raw=true)

I usually keep this running in a separate window while I do other commands.

## Checking your balance
Run `sparkswap wallet balance` to see the balance of your wallet in the supported currencies.

![Check wallet balance](./images/sparkswap_wallet_balance.gif?raw=true)

The “committed” balance is what you have available to trade.

## Placing a Limit Order
Run `sparkswap buy 0.01 100 --market BTC/LTC` to place a limit order to buy 0.01 BTC at a price of 100 LTC per BTC.

![Place a limit order of 0.01 BTC](./images/sparkswap_buy_0.0001_1.297_--market_BTCLTC.gif?raw=true)

There is a corresponding `sell` command as well.

## Placing a Market Order
Run `sparkswap buy 0.01 --market BTC/LTC` to place a market order to buy 0.01 BTC.

![Place a market order of 0.01 BTC](./images/sparkswap_buy_0.0001_--market_BTCLTC.gif?raw=true)

Note that your order will not complete if there is not enough depth in the market to complete the order right away.