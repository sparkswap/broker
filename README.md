# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

This repo contains source for the following products

- kinesis-broker-daemon or kbd
- kinesis-broker-cli or kcli

### Getting Started

Provided below is a quick-n-dirty guide on how to get started with BTC and the Kinesis Broker. In order for the Kinesis CLI and Kinesis Daemon to be fully functional, the following containers must be running:

- rousabeef/BTCD - Headless daemon to interact with blockchain (no wallet in this package)
- LND - Lightning Network Daemon + Wallet
- KLCI - CLI for Kinesis Daemon (this is in its own container OR can be used directly from `./bin/klci` from inside the kbd container)
- KBD - Kinesis Broker Daemon - handle interactions between LND and the Kinesis Exchange (Relayer)

The guide below will run you through the steps of funding your wallet and creating an order through the Kinesis Exchange.

NOTE: This repo only provides functionality and support for the CLI and Daemon. All other processes are required to use the package but are only temporarily stored in this repo.

#### Goals

1. Using docker we will start BTC and LND
2. We will fund the account
    - Fake funding through simnet
    - Funding through a faucet on testnet
    - PRODUCTION funding is not implemented yet
3. We will then open up a payment channel with the relayer (specified address)
4. We will create an order and fill invoices for the relayer

#### Before you begin

You must have docker installed before you can the run kcli or kbd. It is possible to run these applications standalone
on MacOS or Ubuntu, but it is not recommeneded, nor supported by Kinesis.

We need to setup your LND/BTC wallet. Unfortunately LND does not support using custom wallets at this time, so we must create a wallet with
LND AND fund the wallet (either BTC or LTC)

Our example we will use BTC and simnet. We have provided a sample Makefile with commands that you will need to run the setup.

Run the following commands to build some LND containers:

```
make build_client
make build_broker
```

Once the images are built we can `up` the containers by running:

```
make start
```

From this point forward, whenever we want to check on the status of containers, or run commands against them, we will need to `cd` in to the appropriate directory (either `docker` or `docker-user`). Docker-compose will only work when there is a docker-compose file at the root of your `pwd` OR if you specify the directory by using `docker-compose -f my/fake/directory/docker-compose.yml`. It is easier if we simply change directories.

#### Funding your account

Once the LND/BTC containers are up, lets log into the LND container and create a new wallet

The broker will take the following information:

1. Wallet
2. Relayer address
3. Node address


Order of operations for a broker request:
KCLI -> KBD -> LND -> KBD -> RELAYER -> KBD -> LND/CLI/Stream

1. A broker will make a request from the CLI
2. the CLI will post a grpc request to the daemon
3. Daemon will connect to LND and create a channel to the relayer
4. Daemon will send off the request to the relayer
5. Relayer will send a response back to KBD
6. Daemon will respond by either making operations to LND, output back to CLI or opening a client/server stream

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

### Authentication between Client and Daemon

None

### Authentication between Daemon and Relayer

None

### Authentication between Daemon and LND

Macaroons and SSL

### Additional Resource

- (Commander CLI](https://github.com/tj/commander.js)
- [LND interactions](https://dev.lightning.community/overview/)
- [LND setup](https://dev.lightning.community/tutorial/01-lncli/index.html)
