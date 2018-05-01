const { status } = require('grpc')
const LndEngine = require('lnd-engine')

const { LND_HOST, LND_TLS_CERT, LND_MACAROON } = process.env

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
    const options = {
      logger: this.logger,
      tlsCertPath: LND_TLS_CERT,
      macaroonPath: LND_MACAROON
    }
    const res = await new LndEngine(LND_HOST, options).getInfo()
    cb(null, { engineStatus: res.identityPubkey })
  } catch (e) {
    this.logger.error('createOrder failed', { error: e })

    // eslint-disable-next-line
    return cb({ message: e.message, code: status.INTERNAL })
  }
}

module.exports = createOrder
