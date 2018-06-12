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

Using the `deposit` command on KCLI, we've created a script `setup/fund-simnet-wallet.local.sh` that generates BTC for a broker-daemon wallet

Use the following command to generate $$$: `npm run fund`

### Authentication between Daemon and LND

TLS certs and Macaroons are shared through the `/shared` directory located at the root of the `kbd` container. The `/shared` volume is created in the lnd-engine and is shared through the broker project through the use of `-p` on the startup commands located in package.json.

## Product Notes

### Orders and Block Orders

When interacting with the Broker Daemon as a user and submitting `buy` and `sell` orders, you are creating what we refer to as "Block Orders". These block orders can have different price restrictions (limit price, market price) and time restrictions (good-til-cancelled, fill-or-kill, immediate-or-cancel).

These block orders are then "worked" by the broker, meaning split up into individual actions on the Kinesis Network. Specifically, those actions are placing new limit orders and filling other brokers' limit orders.

This structure allows the end user to submit specific desires (e.g. market price, immediate-or-cancel) without relying on the Relayer to honor it -- instead the broker is responsible for interpreting and acting on user instructions.

The overall flow looks something like this:

`buy (kcli) -> BlockOrder (kbd) -> Order (kbd) -> Order (relayer)`

### Development Steps for Relayer/Broker channels

STEPS FOR CHANNELS

1. npm run build && docker-compose build --force-rm
2. Start all containers on the relayer and run `npm run fund` in the relayer
3. On the broker, start all containers
4. On the broker, run `npm run fund-setup`
5. One the broker, run `npm run fund` (this command expects that the relayer is at ../relayer)
6. On the broker, run `./bin/kcli wallet commit-balance BTC`
7. Wait for a little (6 confirmation blocks)
8. Channel is now open
    1. You can check this by going to the relayer and running `docker-compose exec relayer bash -c ‘node ./test-client-scripts/test-lnd.js`
9. restart the relayer (`docker-compose restart`)
10. restart the broker (`docker-compose restart`)
11. If you down your containers and remove the volumes, you will need to run all of these steps again.

**NOTE**: If the channel does not open after a few minutes, restart the relayer w/ `docker-compose restart`. You may also have to restart the broker
