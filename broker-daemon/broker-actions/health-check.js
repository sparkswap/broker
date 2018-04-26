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
  try {
    // Contact the engine and see what is up
    cb(null, { engineStatus: 'We good dawg' })
  } catch (e) {
    this.logger.error('createOrder failed', { error: e.toString() })

    // eslint-disable-next-line
    return cb({ message: e.message, code: status.INTERNAL })
  }
}

module.exports = createOrder
