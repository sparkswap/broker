const RelayerClient = require('../relayer')

/**
 * Creates a stream with the exchange that watches for market events
 *
 * @param {Object} call
 * @param {Object} call.request
 * @param {String} call.request.market
 */
async function watchMarket (call) {
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = call.request
  const [baseSymbol, counterSymbol] = market.split('/')

  // TODO: Rethink the lastUpdated null value for relayer
  const request = { baseSymbol, counterSymbol, lastUpdated: 0 }
  const relayer = new RelayerClient()

  try {
    const watchOrder = await relayer.watchMarket(request)

    watchOrder.on('data', (order) => call.write(order))
    watchOrder.on('end', () => this.logger.info('Finished sending'))
  } catch (e) {
    this.logger.error('watchMarket failed', { error: e.toString() })

    // Figure out a better way to handle errors for call
    call.destroy()
  }
}

module.exports = watchMarket
