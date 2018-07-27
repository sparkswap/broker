### Engines

The broker daemon (sparkswapd) has a concept of an `Engine`. An Engine can be defined as a single implementation/multiple currency interface for all markets. An example of different engines would include LND-Engine and Eclair-Engine.

The default engine for sparkswapd is [LND-Engine](https://github.com/sparkswap/lnd-engine). This is reflected in the code and the defaults set in `docker-compose.yml`. Currently, we only support BOLT spec implementations.
