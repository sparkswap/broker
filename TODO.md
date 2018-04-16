- Setup mocha
- Setup ESLINT
- Create NodeJS shell repo for Kinesis
- Remove shared package.json from daemon + cli
- Use logger for insights, but make sure it is to a file in not in the stdout

Things to implement

- https://raw.githubusercontent.com/treygriffith/kinesis-orderbook/central/src/rpc/cli.js

How we test broker without relayer
How we can test w/ relayer

Tasks:
- We need a testnet relayer that is public

Security Vectors:
- Create-order
- How the relayer opens channels and how the relayer opens channels to you

When you create an order, you have a channel w/ the relayer
Before you create an order, the CLI will need to 'register' the session by opening a payment channel w/ the relayer
We will open a channel back.

1. Docker and testing
2. Authentication between client and relayer
3. Payment channels with the relayer

### Tasks to do for docker stuff

1. When the daemon is started, we need to create a btc instance AND lnd instance
2. Create a wallet for the 'client'
3. Given the relayer URL, we need to connect to that peers LND
