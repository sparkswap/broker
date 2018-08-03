Installation
=========================

## Before you begin

1. Install nvm - `brew install nvm` or your favorite package manager
2. Install the Current LTS 8.11 [NodeJS version](https://github.com/nodejs/Release) and npm version - `nvm install 8.11 --latest-npm`
3. Install [docker](https://docs.docker.com/install/)
    - version requirements are `Docker Community Edition 18.03.0-ce 2018-03-26` or above
4. Create a directory for `sparkswap` and navigate to it - `mkdir -p ./sparkswap && cd sparkswap`

## Install an engine

SparkSwap uses engines to interact with the various Payment Channel Networks used for swaps. The only currently released engine is the [LND-Engine](https://github.com/sparkswap/lnd-engine).

`sparkswapd` (the Broker Daemon) relies on these engines, but they are not bundled, so they need to be built separately.

(in your `sparkswap` directory)

1. Download the engine's source code
```
git clone git@github.com:sparkswap/lnd-engine.git
```
2. Build it, and build the docker images
```
cd lnd-engine
npm run build
```

## Install the Broker Daemon

(in your `sparkswap` directory)

1. Download the broker daemon source code
```
git clone git@github.com:sparkswap/broker.git
```

2. Build the daemon w/ the docker images
```
cd broker
npm run build
```

Additionally, if you'd like to build the daemon w/ out docker images you can use `npm run build no-docker`

3. Add a valid Relayer host based on your environment.

Edit the `docker-compose.yml` file in your `broker` directory to have the appropriate `RELAYER_RPC_HOST` under the `sparkswapd` service.

| Network  | Host                                |
|----------|-------------------------------------|
| Simnet   | relayer.simnet.sparkswap.com:28492  |
| Testnet  | relayer.testnet.sparkswap.com:28492 |

For availability, please check [dev.sparkswap.com](http://dev.sparkswap.com)

## Starting the Broker Daemon

#### SimNet
From inside your broker directory, you can start all the related services with:
```
npm run simnet
```

#### TestNet
From inside your broker directory, you can start all the related services with:
```
npm run testnet
```

#### MainNet
MainNet is NOT SUPPORTED for daemon, however we provide mainnet docker compose files. This is an "AT YOUR OWN RISK" strategy.

From inside your broker directory, you can start all the related services with:
```
npm run mainnet
```

For all environments, you can check on the status of the broker and related services with:
```
docker-compose logs -f
```

#### Funding a wallet

To fund a wallet you need to get a deposit address and send BTC to that address. To get the deposit address, run:
- `./broker-cli/bin/sparkswap wallet new-deposit-address BTC` which will output the deposit address
