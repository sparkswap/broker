# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/kinesis-exchange/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/kinesis-exchange/broker)

This repo contains source for the following products

- kinesis-broker-daemon or kbd
- kinesis-broker-cli or kcli

### Before you begin

You will need to have nvm (and our current node version) installed on your machine.

You will also need to install a plugin for your editor for [Standard](https://standardjs.com/)

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

### SETUP

The guide below will run you through the steps of setup for LND and funding a wallet on a network. This is a bare minimum to get started on the Kinesis exchange.

We need to setup your LND/BTC wallet.

Our example we will use BTC and simnet.

Run the following commands to build some LND containers:

Once the images are built we can `up` the containers by running:

From this point forward, whenever we want to check on the status of containers, or run commands against them, we will need to `cd` in to the appropriate directory (either `docker` or `docker-user`). Docker-compose will only work when there is a docker-compose file at the root of your `pwd` OR if you specify the directory by using `docker-compose -f my/fake/directory/docker-compose.yml`. It is easier if we simply change directories.

#### Goals

1. Using docker we will start BTC and LND
2. We will fund the account
    - Fake funding through simnet
    - Funding through a faucet on testnet

#### Funding your account

Once the LND/BTC containers are up, lets log into the LND container and create a new wallet

The broker will take the following information:

1. Wallet
2. Relayer address
3. Node address

### Authentication

Authentication for LND happens on the server side. We will generate a client cert (tls.cert) and a private server key (tls.key). Only the LND_BTC instance needs to know about both keys.

Our clients/servers will then use the tls.key + a macaroon to make requests to all LND instances. All services will have some form of TLS/SSL for client/server communication.

NOTE: Specifically w/ LND, macaroon auth will fail if the db/macaroons are not created at the same time, so we need to wipe out the macaroons in the /secure/ folder before each new run.

