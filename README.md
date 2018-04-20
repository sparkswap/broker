# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/kinesis-exchange/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/kinesis-exchange/broker)

This repo contains source for the following products

- kinesis-broker-daemon or kbd
- kinesis-broker-cli or kcli

### Before you begin

You will need to have nvm (and our current node version) installed on your machine.

### Getting Started

In order for the Kinesis CLI and Kinesis Daemon to be fully functional, the following containers must be running:

- roasbeef/BTCD - Headless daemon to interact with blockchain (no wallet in this package)
- LND - Lightning Network Daemon + Wallet

Once our wallet is setup, we need to specify the lnd url here:

- KCLI - CLI for Kinesis Daemon (this is in its own container OR can be used directly from `./bin/klci` from inside the kbd container)
- KBD - Kinesis Broker Daemon - handle interactions between LND and the Kinesis Exchange (Relayer)

#### Order of operations

Order of operations for a broker request:
KCLI -> KBD -> LND -> KBD -> RELAYER -> KBD -> LND/CLI/Stream

1. A user will make a request from the CLI
2. the CLI will post a grpc request to the Broker Daemon
3. Daemon will send off the request to the relayer
4. Relayer will send a response back to KBD
5. Daemon will respond by either making operations to LND, output back to CLI or opening a client/server stream

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

### Authentication between CLI (KCLI) and Broker Daemon (KBD)

None

### Authentication between Broker Daemon (KBD) and Relayer

None, yet...

### Authentication between Daemon and LND

Macaroons and SSL

### Additional Resource

- (Commander CLI](https://github.com/tj/commander.js)
- [LND interactions](https://dev.lightning.community/overview/)
- [LND setup](https://dev.lightning.community/tutorial/01-lncli/index.html)

