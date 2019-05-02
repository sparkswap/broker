/**
 * @constant
 * @type {Object}
 * @default
 */
const ORDERBOOK_STATUS_CODES = Object.freeze({
  ORDERBOOK_OK: 'ORDERBOOK_OK',
  ORDERBOOK_NOT_SYNCED: 'ORDERBOOK_NOT_SYNCED'
})

/**
 * @constant
 * @type {Object}
 * @default
 */
const RELAYER_STATUS_CODES = Object.freeze({
  RELAYER_OK: 'RELAYER_OK',
  RELAYER_UNAVAILABLE: 'RELAYER_UNAVAILABLE'
})

/**
 * Gets the relayer status through relayer's health check
 *
 * @param {RelayerClient} relayer - gRPC Client for interacting with the Relayer
 * @param {Object} opts
 * @param {Logger} opts.logger
 * @returns {string} status - either 'OK' or an error message if the call fails
 */
async function getRelayerStatus (relayer, { logger }) {
  try {
    await relayer.adminService.healthCheck({})
    return RELAYER_STATUS_CODES.RELAYER_OK
  } catch (e) {
    logger.error(`Relayer error during status check: `, { error: e.stack })
    return RELAYER_STATUS_CODES.RELAYER_UNAVAILABLE
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
 * @returns {HealthCheckResponse}
 */
async function healthCheck ({ relayer, logger, engines, orderbooks }, { HealthCheckResponse }) {
  const engineStatus = Array.from(engines).map(([ symbol, engine ]) => {
    return { symbol, status: engine.status }
  })

  logger.debug(`Received status from engines`, { engineStatus })

  const relayerStatus = await getRelayerStatus(relayer, { logger })

  logger.debug(`Received status from relayer`, { relayerStatus })

  const orderbookStatus = Array.from(orderbooks).map(([ market, orderbook ]) => {
    const status = orderbook.synced ? ORDERBOOK_STATUS_CODES.ORDERBOOK_OK : ORDERBOOK_STATUS_CODES.ORDERBOOK_NOT_SYNCED
    return { market, status }
  })

  logger.debug(`Received status from orderbooks`, { orderbookStatus })

  return new HealthCheckResponse({ engineStatus, relayerStatus, orderbookStatus })
}

module.exports = healthCheck
