/**
 * @constant
 * @type {Object}
 * @default
 */
const STATUS_CODES = Object.freeze({
  OK: 'OK',
  LOCKED: 'LOCKED',
  NOT_AVAILABLE: 'NOT AVAILABLE'
})

/**
 * Returns an individual engine's status
 *
 * @param {Array} req
 * @param {String} req.symbol
 * @param {Object} req.engine
 * @return {Object} res
 * @return {String} res.symbol - an engine's currency symbol (e.g. BTC or LTC)
 * @return {String} res.status - an engine's status
 */
async function getEngineStatus ([ symbol, engine ]) {
  let status

  const isAvailable = await engine.isAvailable()

  console.log(isAvailable)

  if (isAvailable && !engine.unlocked) {
    status = STATUS_CODES.LOCKED
  } else if (isAvailable) {
    status = STATUS_CODES.OK
  } else {
    status = STATUS_CODES.NOT_AVAILABLE
  }

  return { symbol, status }
}

/**
 * Gets the relayer status through relayer's health check
 *
 * @param {RelayerClient} relayer - gRPC Client for interacting with the Relayer
 * @return {String} status - either 'OK' or an error message if the call fails
 */
async function getRelayerStatus (relayer) {
  try {
    await relayer.healthService.check({})
    return STATUS_CODES.OK
  } catch (e) {
    return e.toString()
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
  const statusPromises = Array.from(engines).map(getEngineStatus)
  const engineStatus = await Promise.all(statusPromises)

  logger.debug(`Received status from engines`, { engineStatus })

  const relayerStatus = await getRelayerStatus(relayer)

  logger.debug(`Received status from relayer`, { relayerStatus })

  return new HealthCheckResponse({ engineStatus, relayerStatus })
}

module.exports = healthCheck
