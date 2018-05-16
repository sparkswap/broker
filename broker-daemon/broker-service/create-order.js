const { status } = require('grpc')

/**
 * Creates an order w/ the exchange
 *
 * @param {Object} call
 * @param {Object} call.request
 * @param {String} call.request.amount
 * @param {String} call.request.price
 * @param {String} call.request.market
 * @param {String} call.request.side
 * @param {String} [timeinforce] call.request.timeinforce
 * @param {fn} cb
 */
async function createOrder (call, cb) {
  const {
    // amount,
    // price,
    market,
    // timeinforce,
    side
  } = call.request

  // We need to calculate the base amount/counter amount based off of current
  // prices

  const [baseSymbol, counterSymbol] = market.split('/')

  const request = {
    ownerId: '123455678',
    payTo: 'ln:12234987',
    baseSymbol,
    counterSymbol,
    baseAmount: '10000',
    counterAmount: '1000000',
    side
  }

  try {
    const order = await this.relayer.createOrder(request)
    cb(null, { orderId: order.orderId })
  } catch (e) {
    this.logger.error('createOrder failed', { error: e.toString() })

    // eslint-disable-next-line
    return cb({ message: e.message, code: status.INTERNAL })
  }
}

module.exports = createOrder
