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

Use `npm run build` to install dependencies and build the cli/daemon

Then, start the containers for KCLI/KBD with `docker-compose up -d`. You can then check if they are running w/ `docker-compose ps`

### Using the CLI

Once all containers are started succesfully, we can check to make sure the CLI/KBD is running w/ the engine.

We can run the following healthcheck command `./bin/kcli healthcheck` to verify that we can hit LND/BTCD.

Alternatively, we have created a CLI container where we can run the check:

```
docker-compose run kcli healthcheck
```

NOTE: This will initialize a new container on every run, which is very process heavy.

### Development

There are times where you will want to work on an Engine and check the functionality directly w/ the broker. In order to do this, in package.json, you can change the dependency to a specific branch like so:  `kinesis-exchange/engine#my-branch`, then MAKE SURE to delete npm-shrinkwrap/package-lock and reinstall everything w/ `npm run build`.

### Running tests

- `npm test` will run all tests in the kbd docker container
- `npm run coverage` will run tests w/ code coverage in the container

Why are all tests run in the container? This is due to dependencies that need to run/build on the target architecture (which is linux). This is also consistent with how tests are ran on CI

### Authentication between CLI (KCLI) and Broker Daemon (KBD)

None, yet...

### Authentication between Broker Daemon (KBD) and Relayer

None, yet...

### Authentication between Daemon and LND

TLS certs and Macaroons are shared through the `/shared` directory located at the root of the `kbd` container. The `/shared` volume is created in the lnd-engine and is shared through the broker project through the use of `-p` on the startup commands located in package.json.
