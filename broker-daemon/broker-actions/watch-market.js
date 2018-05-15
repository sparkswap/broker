/**
 * Creates a stream with the exchange that watches for market events
 *
 * @param {Object} call
 * @param {Object} call.request
 * @param {String} call.request.market
 */
async function watchMarket (call) {
  this.logger.info('yoyoyoyoyoyo')
  // TODO: Some validation on here. Maybe the client can call out for valid markets
  // from the relayer so we dont event make a request if it is invalid
  const { market } = call.request
  try {
    this.logger.info('WHAT THE ACTIALSDF FUCKSFSDFSDFG')
    this.orderbooks[market].all().forEach(order => call.write(order))
  } catch (e) {
    this.logger.error('watchMarket failed', { error: e.toString() })

    // Figure out a better way to handle errors for call
    call.destroy()
  }
}

module.exports = watchMarket
