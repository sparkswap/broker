<img src="https://sparkswap.com/img/logo.svg" alt="sparkswap - sparkswap.com" width="400">

[![CircleCI](https://circleci.com/gh/sparkswap/broker.svg?style=svg&circle-token=11fe800209ce8a6839b3c071f8f61ee8a345b026)](https://circleci.com/gh/sparkswap/broker)

sparkswap Broker basic information
===========================

The sparkswap broker is responsible for:

1. Custodying user assets by managing wallets and private keys
2. Interpreting user actions and converting them into network actions
3. Interacting with the SparkSwap Relayer, including placing and filling orders
4. Executing Payment Channel Network swaps to settle executed orders

The following diagram shows how the broker interacts with the other parts of the sparkswap system.

![Network Overview Diagram](/docs/images/NetworkOverview.png)
