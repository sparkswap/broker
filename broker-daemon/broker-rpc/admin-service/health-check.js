const { eachRecord } = require('../../utils')

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
 * Get the number of records in a store and its children
 * @param   {Sublevel} store    - Store to get record count from
 * @param   {string} name       - Name of this store
 * @param   {string} parentName - Name of the parent of this store
 * @param   {Array}  stores     - Array to include this store's record count in
 * @returns {Array}               All stores and their record counts including
 *                                `store` and its sublevels.
 */
async function getRecordCounts (store, name = 'store', parentName = '', stores = []) {
  let count = 0
  await eachRecord(store, () => { count++ })

  // We use a flat structure to make it simpler to send over the wire despite the fact
  // that it is actually nested.
  stores.push({
    parentName,
    name,
    count
  })

  const sublevels = Object.entries(store.sublevels)

  await Promise.all(sublevels.map(([ subName, store ]) => {
    return getRecordCounts(store, subName, name, stores)
  }))

  return stores
}

/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer - gRPC Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Map<string, Engine>} request.engines - all available Payment Channel Network engines in the Broker
 * @param {Map<string, Orderbook>} request.orderbooks
 * @param {Sublevel} request.store
 * @param {Object} responses
 * @param {Function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @returns {HealthCheckResponse}
 */
async function healthCheck ({ params, relayer, logger, engines, orderbooks, store }, { HealthCheckResponse }) {
  const { includeRecordCounts = false } = params

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

  const message = {
    engineStatus,
    relayerStatus,
    orderbookStatus
  }

  if (includeRecordCounts) {
    message.recordCounts = await getRecordCounts(store)

    logger.debug('Received record counts from the data store')
  }

  return new HealthCheckResponse(message)
}

module.exports = healthCheck
