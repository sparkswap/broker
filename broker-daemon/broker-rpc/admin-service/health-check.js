/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const STATUS_CODES = Object.freeze({
  UNAVAILABLE: 'UNAVAILABLE',
  OK: 'OK'
})

/**
 * Gets the relayer status through relayer's health check
 *
 * @param {RelayerClient} relayer - gRPC Client for interacting with the Relayer
 * @return {String} status - either 'OK' or an error message if the call fails
 */
async function getRelayerStatus (relayer, { logger }) {
  try {
    await relayer.healthService.check({})
    return STATUS_CODES.OK
  } catch (e) {
    logger.error(`Relayer error during status check: `, { error: e.stack })
    return STATUS_CODES.UNAVAILABLE
  }
}

/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - gRPC Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Map<String, Engine>} request.engines - all available Payment Channel Network engines in the Broker
 * @param {Object} responses
 * @param {function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function healthCheck ({ relayer, logger, engines }, { HealthCheckResponse }) {
  const engineStatus = Array.from(engines).map(([ symbol, engine ]) => {
    return { symbol, status: engine.status }
  })

  logger.debug(`Received status from engines`, { engineStatus })

  const relayerStatus = await getRelayerStatus(relayer, { logger })

  logger.debug(`Received status from relayer`, { relayerStatus })

  return new HealthCheckResponse({ engineStatus, relayerStatus })
}

module.exports = healthCheck
