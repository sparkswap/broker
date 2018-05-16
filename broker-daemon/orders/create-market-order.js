const PublicError = require('grpc-methods')

async function createMarketOrder (orderbook, { side, amount }) {
  throw new PublicError('Only Limit Orders are currently supported. Please supply a price.')
}

module.exports = createMarketOrder
