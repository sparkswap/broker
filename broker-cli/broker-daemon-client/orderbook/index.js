/**
 * Opens a stream with the broker daemon to watch for market events from
 * the exchange
 *
 * @function
 * @param {Object} params
 * @returns {grpc.ServerStream}
 */
function watchMarket (params) {
  // TODO: loggin
  // TODO: document what params need to be passed in
  return this.orderBookService.watchMarket(params)
}

module.exports = {
  watchMarket
}
