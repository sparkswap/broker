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


#### Tasks to do docker stuff
1. create a wallet
2. figure out why lnd is exiting on successful commands need this to stop :(
3. figure out why macaroons aren't generating correctly (currently I have them disabled)
4. Grab test scripts from relayer and automate the creation of a wallet
5. Given an LND url, Relayer URL, we need to connect to peers (LND)
6. Start hosting relayers on digital ocean for testing (sim or test)

NYSE, CXE

All the crypto exchanges use TCP in some way to send order data
We are currently using HTTP/2
Most crypto exchanges

Traditional exchanges do UDP, multicast... so that everyone gets the information at the same time. When you do the same with websockets, because it is conntection based, different users will get order data at the time.
