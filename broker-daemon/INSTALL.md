Install the Broker Daemon
-------------------------

### Before you begin

1. Install nvm - `brew install nvm` or your favorite package manager
2. Install the current LTS node and npm version - `nvm install --lts --latest-npm`
3. Install [docker](https://docs.docker.com/install/)
4. Create a directory for `sparkswap` and navigate to it - `mkdir -p ./sparkswap && cd sparkswap`

### Install an engine

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
npm run build-images
```

### Install the Broker Daemon

(in your `sparkswap` directory)

1. Download the broker daemon source code
```
git clone git@github.com:sparkswap/broker.git
```

2. Build the daemon and the docker images
```
cd broker
npm run build
npm run build-images
```

3. Add a valid Relayer host based on your environment.

Edit the `docker-compose.yml` file in your `broker` directory to have the appropriate `RELAYER_RPC_HOST` under the `sparkswapd` service.

| Network  | Host                                |
|----------|-------------------------------------|
| Simnet   | simnet-relayer.sparkswap.com:28492  |
| Testnet  | testnet-relayer.sparkswap.com:28492 |

For availability, please check [dev.sparkswap.com](http://dev.sparkswap.com)

### Start the Broker Daemon

From inside your broker directory, you can start all the related services with:
```
docker-compose up -d

```

Check on the status of the broker and related services with:
```
docker-compose logs -f
```

### Using the CLI

Check out the [documentation for the CLI](https://sparkswap.com/docs/broker/cli) to see how to install and use it.
