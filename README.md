SparkSwap Broker CLI + Daemon
===========================

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/sparkswap/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/sparkswap/broker)

This repo contains source for the following products:

- [`sparkswap` (CLI for SparkSwap Broker Daemon)](./broker-cli)
    - User interface for sparkswapd
- [`sparkswapd` (SparkSwap Broker Daemon)](./broker-daemon)
    - Daemon that handles interactions between the user's lightning nodes and the SparkSwap Relayer

Documentation can be found in each directories `README.md` at [./broker-cli](./broker-cli) or [./broker-daemon](./broker-daemon) respectively.

## Installation

See the [installation instructions](./broker-daemon/INSTALL.md).

If you will be developing against sparkswapd (or any SparkSwap repository), it is required to run the code through [Standard](https://standardjs.com/). StandardJS plugins can be downloaded for your favorite editor. The SparkSwap Broker and Broker CLI codebase follows StandardJS formatting.

#### Using the CLI

You can run `./broker-cli/bin/sparkswap -h` to view all available commands.

To set your user configuration, copy `./broker-cli/sample-.sparkswap.js` to `~/.sparkswap.js` and edit the file.
You can view default configuration for `sparkswap` in `./broker-cli/.sparkswap.default.js`.

Current configuration is limited to:
- Default Daemon RPC address

Additionally, you can access a specific version of sparkswapd by setting the `--rpc-address` on any `sparkswap` command.

#### Running tests

- `npm test` will run all tests on your local machine
- `npm run coverage` will run tests w/ code coverage

#### Funding a wallet

....

### Authentication between Daemon and LND

TLS certs and Macaroons are shared through the `/shared` directory located at the root of the `sparkswapd` container. The `/shared` volume is created in the lnd-engine and is shared through the broker project through the use of `-p` on the startup commands located in package.json.

The `/shared` directory will be a common pattern for all engines of the daemon.

## Product Notes

### Engines

The broker daemon (sparkswapd) has a concept of an `Engine`. An Engine can be defined as a single implementation/multiple currency interface for all markets. An example of different engines would include LND-Engine and Eclair-Engine.

The default engine for sparkswapd is [LND-Engine](https://github.com/sparkswap/lnd-engine). This is reflected in the code and the defaults set in `docker-compose.yml`. Currently, we only support BOLT spec implementations at this time.

### Orders and Block Orders

When interacting with the Broker Daemon as a user and submitting `buy` and `sell` orders, you are creating what we refer to as "Block Orders". These block orders can have different price restrictions (limit price, market price) and time restrictions (good-til-cancelled, fill-or-kill, immediate-or-cancel).

These block orders are then "worked" by the broker, meaning split up into individual actions on the SparkSwap Relayer. Specifically, those actions are placing new limit orders and filling other brokers' limit orders.

This structure allows the end user to submit specific desires (e.g. market price, immediate-or-cancel) without relying on the Relayer to honor it -- instead the broker is responsible for interpreting and acting on user instructions.

The overall flow looks something like this:

`buy (sparkswap) -> BlockOrder (sparkswapd) -> Order (sparkswapd) -> Order (relayer)`
