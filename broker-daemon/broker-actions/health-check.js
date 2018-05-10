const RelayerClient = require('../relayer')
const LndEngine = require('lnd-engine')

const { LND_HOST, LND_TLS_CERT, LND_MACAROON } = process.env
const STATUS_CODES = Object.freeze({
  OK: 'OK'
})

/**
 * @param {Object} call
 * @param {fn} cb
 */
async function healthCheck (call, cb) {
  const lndResStatus = await lndStatus()
  const relayerResStatus = await relayerStatus()
  cb(null, {lndStatus: lndResStatus, relayerStatus: relayerResStatus})
}

/**
 * @return {String}
 */
async function lndStatus () {
  try {
    // TODO: Remove these because they are the default options
    const options = {
      logger: this.logger,
      tlsCertPath: LND_TLS_CERT,
      macaroonPath: LND_MACAROON
    }
    await new LndEngine(LND_HOST, options).getInfo()
    return STATUS_CODES.OK
  } catch (e) {
    return e.toString()
  }
}

/**
 * @return {String}
 */
async function relayerStatus () {
  const relayer = new RelayerClient()
  try {
    await relayer.healthCheck({})
    return STATUS_CODES.OK
  } catch (e) {
    return e.toString()
  }
}

module.exports = { healthCheck }
