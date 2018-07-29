
Development
=========================

### Authentication between Daemon and LND

TLS certs and Macaroons are shared through the `/shared` directory located at the root of the `sparkswapd` container. The `/shared` volume is created in the lnd-engine and is shared through the broker project through the use of `-p` on the startup commands located in package.json.

The `/shared` directory will be a common pattern for all engines of the daemon.

#### Using the CLI

Check out the [documentation for the CLI](https://sparkswap.com/docs/broker/cli) to see how to install and use it.

#### Running tests

- `npm test` will run all tests on your local machine
- `npm run coverage` will run tests w/ code coverage


#### Using Standard

If you will be developing against sparkswapd (or any SparkSwap repository), it is required to run the code through [Standard](https://standardjs.com/). StandardJS plugins can be downloaded for your favorite editor. The SparkSwap Broker and Broker CLI codebase follows StandardJS formatting.
