const LndEngine = require('lnd-engine')

const { LND_HOST, LND_TLS_CERT, LND_MACAROON } = process.env
const STATUS_CODES = Object.freeze({
  OK: 'OK'
})

/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} responses
 * @param {function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function healthCheck ({ relayer }, { HealthCheckResponse }) {
  const engineResStatus = await engineStatus()
  const relayerResStatus = await relayerStatus(relayer)
  return new HealthCheckResponse({ engineStatus: engineResStatus, relayerStatus: relayerResStatus })
}

/**
 * @return {String}
 */
async function engineStatus () {
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
 * @param {RelayerClient} relayer - grpc Client for interacting with the Relayer
 * @return {String}
 */
async function relayerStatus (relayer) {
  try {
    await relayer.healthCheck({})
    return STATUS_CODES.OK
  } catch (e) {
    return e.toString()
  }
}

module.exports = healthCheck
