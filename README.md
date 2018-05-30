# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/kinesis-exchange/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/kinesis-exchange/broker)

This repo contains source for the following products:

- KCLI - CLI for Kinesis Daemon (this is in its own container OR can be used directly from `./bin/klci` from inside the kbd container)
- KBD - Kinesis Broker Daemon - handle interactions between LND and the Kinesis Exchange (Relayer)

### Before you begin

You will need to have nvm (and our current node version) installed on your machine.

It is also recommended that you install a [Standard](https://standardjs.com/) plugin for your editor. We currently follow StandardJS formatting.

Additonally, you must have ssh/private access to the lnd-engine repo: `kinesis-exchange/lnd-engine`.

### Getting Started

Run the following commands in order:

1. `npm run build` - This command will install local dependencies, install proto files and build all broker containers
2. `docker-compose up -d` - starts all the containers

### Workflow

#### Using the CLI

You can run `./bin/kcli -h` to view all available commands. (this can be done in the kcli container using `docker-compose run kcli bash -c './bin/kcli -h'`)

NOTE: Running a command on the kcli container will initialize a new container on every run, which can become very process heavy.

#### Running tests

- `npm test` will run all tests
- `npm run coverage` will run tests w/ code coverage

#### Funding a wallet on SIMNET

Using the `deposit` command on KCLI, we've created a script `setup/fund-simnet-wallet.sh` that generates BTC for a broker-daemon wallet

Use the following command to generate $$$: `npm run money`

### Authentication between Daemon and LND

TLS certs and Macaroons are shared through the `/shared` directory located at the root of the `kbd` container. The `/shared` volume is created in the lnd-engine and is shared through the broker project through the use of `-p` on the startup commands located in package.json.

## Product Notes

### Orders and Block Orders

When interacting with the Broker Daemon as a user and submitting `buy` and `sell` orders, you are creating what we refer to as "Block Orders". These block orders can have different price restrictions (limit price, market price) and time restrictions (good-til-cancelled, fill-or-kill, immediate-or-cancel).

These block orders are then "worked" by the broker, meaning split up into individual actions on the Kinesis Network. Specifically, those actions are placing new limit orders and filling other brokers' limit orders.

This structure allows the end user to submit specific desires (e.g. market price, immediate-or-cancel) without relying on the Relayer to honor it -- instead the broker is responsible for interpreting and acting on user instructions.

The overall flow looks something like this:

`buy (kcli) -> BlockOrder (kbd) -> Order (kbd) -> Order (relayer)`