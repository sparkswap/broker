const PublicError = require('grpc-methods')

async function createGoodTilCancelledOrder (orderbook, { side, amount, price }) {
  throw new PublicError('Still working on it!')
}

module.exports = createGoodTilCancelledOrder
