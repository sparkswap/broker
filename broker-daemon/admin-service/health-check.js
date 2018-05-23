/**
 * @constant
 * @type {Object}
 * @default
 */
const STATUS_CODES = Object.freeze({
  OK: 'OK'
})

/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function healthCheck ({ relayer, logger }, { HealthCheckResponse }) {
  const engineResStatus = await engineStatus()
  logger.debug(`Received status from engine`, { engineStatus: engineResStatus })
  const relayerResStatus = await relayerStatus(relayer)
  logger.debug(`Received status from relayer`, { relayerStatus: relayerResStatus })
  return new HealthCheckResponse({ engineStatus: engineResStatus, relayerStatus: relayerResStatus })
}

/**
 * @return {String}
 */
async function engineStatus () {
  try {
    await this.engine.getInfo()
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
