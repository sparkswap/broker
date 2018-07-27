sparkswap Broker basic information
===========================

The sparkswap broker is responsible for:

1. Custodying user assets by managing wallets and private keys
2. Interpreting user actions and converting them into network actions
3. Interacting with the SparkSwap Relayer, including placing and filling orders
4. Executing Payment Channel Network swaps to settle executed orders

The following diagram shows the different parts of the broker and how the broker interacts with the other parts of the sparkswap system.

- The broker RPC API takes commands from the user and executes on them on the broker daemon.

- The orderbook, accessed through the broker roc api, is used to view all orders across all nodes on the network. The orders are streamed so the orderbook will have the most up to date information at all times.

- The Block Order Worker is used to manage a users orders, splitting up user instructions into actions on the network, such as filling another users order or submitting their own.

- The relayer client is used to access the sparkswap relayer, see [Interaction with the relayer](/docs/RELAYER.md) to learn more about the responsibilities of the relayer

![Network Overview Diagram](/docs/images/NetworkOverview.png)
