# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/kinesis-exchange/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/kinesis-exchange/broker)

This repo contains source for the following products:

- KCLI - CLI for Kinesis Daemon (this is in its own container OR can be used directly from `./bin/klci` from inside the kbd container)
- KBD - Kinesis Broker Daemon - handle interactions between LND and the Kinesis Exchange (Relayer)

### Before you begin

1. Install nvm - `brew install nvm` or your favorite package manager
2. Install the current LTS node and npm version - `nvm install --lts --latest-npm`
3. Install [docker](https://docs.docker.com/install/)
4. Set up a local [Relayer](https://github.com/kinesis-exchange/relayer)

It is also recommended that you install a [Standard](https://standardjs.com/) plugin for your editor. We currently follow StandardJS formatting.

Additonally, you must have ssh/private access to the lnd-engine repo: https://github.com/kinesis-exchange/lnd-engine.

### Getting Started

Run the following commands in order:

1. `npm run build` - This command will install local dependencies, install proto files and build all broker containers
2. `docker-compose up -d` - starts all the containers

### Workflow

#### Using the CLI

You can run `./bin/kcli -h` to view all available commands.

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

The following steps will get your broker/relayer projects to a state where you can successfully buy/sell orders.

1. If this is your first time running the new code, down all of your containers (relayer/broker)
1. In the relayer directory, build the project and containers w/ `npm run build && docker-compose build --force-rm`
2. In the relayer directory, Start all containers w/ `docker-compose up -d`
3. In the relayer directory, fund the relayer w/ `npm run fund`
4. In the broker directory, build the project with `npm run build`
5. In the broker directory, transfer the certs from relayer to broker w/ `npm run fund-setup`
6. In the broker directory, fund the broker w/ `npm run fund`
    - **NOTE: (this command expects that the relayer is at `../relayer`)**
6. In the broker, commit a balance to the relayer by running `./bin/kcli wallet commit-balance BTC`
7. If successful, a channel from the `broker -> relayer` is now in a pending state!
9. In the relayer directory, re-create the relayer so that it can catch up to the blocks we have just generated (`docker-compose up -d --force-recreate`)
10. In the broker directory, re-create the broker for the same thing ^^ (`docker-compose up -d --force-recreate`)

**IMPORTANT: ** If you down your containers and remove the volumes, you will need to run all of these steps again.

Additionally, you can check the status of the channel by running the following command in the relayer directory `docker-compose exec relayer bash -c 'node ./test-client-scripts/test-lnd.js'`

**NOTE**: If the channel does not open after a few minutes, you need to rerun steps 9/10. For some reason, on simnet, because of the way we fund our wallets, BTCD has a problem with handling so many block confirmations at the same time.
