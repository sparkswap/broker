/**
 * @constant
 * @type {Object}
 * @default
 */
const STATUS_CODES = Object.freeze({
  OK: 'OK'
})

/**
 * Gets an engine status for a specified engine
 *
 * @param {Engine} engine
 * @return {String} OK
 * @return {String} error message if engine call fails
 */
async function getEngineStatus (engine) {
  try {
    await engine.isAvailable()
    return STATUS_CODES.OK
  } catch (e) {
    return e.toString()
  }
}

/**
 * Gets the relayer status through relayer's health check
 *
 * @param {RelayerClient} relayer - grpc Client for interacting with the Relayer
 * @return {String} OK
 * @return {String} error message if engine call fails
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
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function healthCheck ({ relayer, logger, engines }, { HealthCheckResponse }) {
  const engineStatus = []

  for (var [symbol, engine] of engines) {
    var status = await getEngineStatus(engine)
    logger.debug(`Received status from ${symbol} engine`, { status })
    engineStatus.push({ symbol, status })
  }

  const relayerStatus = await getRelayerStatus(relayer)
  logger.debug(`Received status from relayer`, { relayerStatus })
  return new HealthCheckResponse({ engineStatus, relayerStatus })
}

module.exports = healthCheck
