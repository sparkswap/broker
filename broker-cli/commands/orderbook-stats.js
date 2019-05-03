const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, MARKET_NAME_HELP_STRING } = require('../utils/strings')

async function orderbookStats (args, opts, logger) {
  const { market, rpcAddress } = opts
  const request = { market }

  try {
    const brokerDaemonClient = new BrokerDaemonClient(rpcAddress)
    const {
      bids = [],
      asks = []
    } = await brokerDaemonClient.orderBookService.getOrderbook(request)

    console.log('total bids:', bids.length)
    console.log('total asks:', asks.length)
  } catch (e) {
    logger.error(handleError(e))
  }
}

module.exports = (program) => {
  program
    .command('orderbook-stats', 'View summary statistics of the orderbook')
    .option('--market <marketName>', MARKET_NAME_HELP_STRING, validations.isMarketName, null, true)
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(orderbookStats)
}
