# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/kinesis-exchange/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/kinesis-exchange/broker)

This repo contains source for the following products:

- KCLI - CLI for Kinesis Daemon (this is in its own container OR can be used directly from `./broker-cli/bin/klci` from inside the kbd container)
- KBD - Kinesis Broker Daemon - handle interactions between LND and the Kinesis Exchange (Relayer)

### Before you begin

1. Install nvm - `brew install nvm` or your favorite package manager
2. Install the current LTS node and npm version - `nvm install --lts --latest-npm`
3. Install [docker](https://docs.docker.com/install/)
4. Set up a local [Relayer](https://github.com/kinesis-exchange/relayer)

It is also recommended that you install a [Standard](https://standardjs.com/) plugin for your editor. We currently follow StandardJS formatting.

Additonally, you must have ssh/private access to the lnd-engine repo: https://github.com/kinesis-exchange/lnd-engine.

### Getting Started

1. `npm run build` - This command will install local dependencies, install proto files and build all broker containers
2. `npm run build-images` - builds the kbd image to be used by docker-compose
2a. Make sure that you have ran `npm run build-images` on the lnd-engine before trying to start all containers for the broker
3. `docker-compose up -d` - starts all the containers

### Workflow

#### Using the CLI

You can run `./broker-cli/bin/kcli -h` to view all available commands.

To set your user configuration, copy `./broker-cli/sample-.kcli.js` to `~/.kcli.js` and edit the file.
You can view default configuration for kcli in `./broker-cli/.kcli.default.js`.

Current configuration is limited to:
- Default Daemon RPC address

Additionally, you can access a specific version of kbd by setting the --rpc-address on any kcli command.

#### Running tests

- `npm test` will run all tests
- `npm run coverage` will run tests w/ code coverage

#### Funding a wallet on SIMNET

Use the command `npm run fund <currency>` to find a broker's wallet on simnet (development only)

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
2. In the lnd-engine directory, run `npm run build-images`
3. In the relayer directory, build the relayer image w/ `npm run build-images`
4. In the broker directory, build the broker image w/ `npm run build-images`
5. In the relayer directory, build the project w/ `npm run build`
6. In the relayer directory, Start all containers w/ `docker-compose up -d`
7. In the relayer directory, fund the relayer w/ `npm run fund <currency>`
    - This command may fail with a weird js error due to the relayer still initializing. If the command fails, just rerun it.
    - Make sure to fund the relayer on all applicable currencies
8. In the broker directory, build the project with `npm run build`
9. In the broker directory, run `docker-compose up -d` to start all the containers
10. In the broker directory, fund the broker w/ `npm run fund <currency>`
    - **NOTE: (this command expects that the relayer is at `../relayer`)** however you can set your own w/ RELAYER_DIR=<your relayer dir>
11. Once you have verified the broker has a balance (after a few blocks have been mined, commit a balance to the relayer by running `./broker-cli/bin/kcli wallet commit-balance BTC`
    - NOTE: Make sure you have the correct rpc-address set for the kcli
12. If successful, a channel from the `broker -> relayer` is now in a pending state!

**IMPORTANT: ** If you down your containers and remove the volumes, you will need to backtrack and refund certain parts of the stack. Use the directions above for reference.
