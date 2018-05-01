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
async function healthCheck (call, cb) {
  try {
    // TODO: Remove these because they are the default options
    const options = {
      logger: this.logger,
      tlsCertPath: LND_TLS_CERT,
      macaroonPath: LND_MACAROON
    }
    const res = await new LndEngine(LND_HOST, options).getInfo()
    // TODO: Instead of using the publicKey we should just be checking a status
    // to make sure everything is running correctly
    cb(null, { engineStatus: res.identityPubkey })
  } catch (e) {
    this.logger.error('healthCheck failed', { error: e })

    // eslint-disable-next-line
    return cb({ message: e.message, code: status.INTERNAL })
  }
}

module.exports = healthCheck
