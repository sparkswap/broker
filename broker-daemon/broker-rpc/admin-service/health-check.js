/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const STATUS_CODES = Object.freeze({
  UNAVAILABLE: 'UNAVAILABLE',
  OK: 'OK',
  NOT_SYNCED: 'NOT_SYNCED',
  BROKER_NOT_REGISTERED: 'BROKER_NOT_REGISTERED'
})

/**
 * Gets the relayer status through relayer's health check
 *
 * @param {RelayerClient} relayer - gRPC Client for interacting with the Relayer
 * @return {string} status - either 'OK' or an error message if the call fails
 */
async function getRelayerStatus (relayer, { logger }) {
  try {
    const authorization = relayer.identity.authorize()
    await relayer.adminService.healthCheck({}, authorization)
    return STATUS_CODES.OK
  } catch (e) {
    logger.error(`Relayer error during status check: `, { error: e.stack })

    if (e.message && e.message.includes('No active entity exists')) {
      return STATUS_CODES.BROKER_NOT_REGISTERED
    }

    return STATUS_CODES.UNAVAILABLE
  }
}

/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - gRPC Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Map<string, Engine>} request.engines - all available Payment Channel Network engines in the Broker
 * @param {Object} responses
 * @param {Function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function healthCheck ({ relayer, logger, engines, orderbooks }, { HealthCheckResponse }) {
  const engineStatus = Array.from(engines).map(([ symbol, engine ]) => {
    return { symbol, status: engine.status }
  })

  logger.debug(`Received status from engines`, { engineStatus })

  const relayerStatus = await getRelayerStatus(relayer, { logger })

  logger.debug(`Received status from relayer`, { relayerStatus })

  const orderbookStatus = Array.from(orderbooks).map(([ market, orderbook ]) => {
    const status = orderbook.synced ? STATUS_CODES.OK : STATUS_CODES.NOT_SYNCED
    return { market, status }
  })

  logger.debug(`Received status from orderbooks`, { orderbookStatus })

  return new HealthCheckResponse({ engineStatus, relayerStatus, orderbookStatus })
}

module.exports = healthCheck
