# Kinesis Broker CLI + Daemon

- kinesis-broker-daemon or kbd
- kinesis-broker-cli or kcli

### Before you begin

You must have docker installed before you can the run kcli or kbd. It is possible to run these applications standalone
on MacOS or Ubuntu, but it is not recommeneded, nor supported by Kinesis.

### Dev Setup

In order for the Kinesis CLI and Kinesis Daemon to be fully functional, the following

- BTCD - Headless daemon to interact with blockchain (no wallet is included)
- LND - Lightning Network Daemon + Wallet
- KLCI
- KND

### What happens when I make an order?

In order for these steps to be fulfilled, a user must first have the client up and running AND money transfered to an LND wallet.

1. We make a request for a buy
  - `kcli buy --amount 100 --price 10 --market BTC/LTC -t GTC`
2. The cli hits the KBD at an `order` endpoint
  - this endpoint will then take those fields and fit the request to the RPC format
    for the relayer. This request would add the LN address and would split the market
    name and calculate other information
3. KBD would hit the relayer with the create-order request
4. Relayer returns a response giving fee/deposit invoices
5. KBD will then take those invoices and pay them with the LND wallet
6. KBD will then create fee/deposit refund invoices for the relayer
7. KBD will send a request to the `place-order` endpoint to complete the order
8. Relayer will say all good to the go
9. KCLI returns a successfully response
10. KBD will receive an event for a new order

### Additional Resource

- (Commander CLI](https://github.com/tj/commander.js)

### Website stuff

Website for Kines.is is setup on Zeit
Figure out how to host on Zeit
