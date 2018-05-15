# Kinesis Broker CLI + Daemon

<img src="https://kines.is/logo.png" alt="Kinesis Exchange" width="550">

[![CircleCI](https://circleci.com/gh/kinesis-exchange/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/kinesis-exchange/broker)

This repo contains source for the following products:

- KCLI - CLI for Kinesis Daemon (this is in its own container OR can be used directly from `./bin/klci` from inside the kbd container)
- KBD - Kinesis Broker Daemon - handle interactions between LND and the Kinesis Exchange (Relayer)

### Before you begin

You will need to have nvm (and our current node version) installed on your machine.

It is also recommended that you install a [Standard](https://standardjs.com/) plugin for your editor. We currently follow StandardJS formatting.

Additonally, you must have ssh/private access to the `kinesis-exchange/lnd-engine`.

### Getting Started

Use `npm run build`. This command will install dependencies, install proto files from the relayer, build all docker containers and start all processes.

Once the script is done running, you can then check the status of all containers w/ `docker-compose ps`

### Using the CLI

Once all containers are started succesfully, we can check to make sure the CLI/KBD is running w/ the engine.

We can run the following healthcheck command `./bin/kcli healthcheck` to verify that we can hit LND/BTCD.

Alternatively, we have created a CLI container where we can run the check: `docker-compose run kcli bash -c './bin/kcli healthcheck'`

```
docker-compose run kcli healthcheck
```

NOTE: This will initialize a new container on every run, which is very process heavy.

### Development


### Running tests

- `npm test` will run all tests
- `npm run coverage` will run tests w/ code coverage

### Authentication between CLI (KCLI) and Broker Daemon (KBD)

None, yet...

### Authentication between Broker Daemon (KBD) and Relayer

None, yet...

### Authentication between Daemon and LND

TLS certs and Macaroons are shared through the `/shared` directory located at the root of the `kbd` container. The `/shared` volume is created in the lnd-engine and is shared through the broker project through the use of `-p` on the startup commands located in package.json.
