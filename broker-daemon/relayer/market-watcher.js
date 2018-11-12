const EventEmitter = require('events')
const { promisify } = require('util')
const { MarketEvent } = require('../models')
const { migrateStore, eachRecord, Checksum } = require('../utils')

/**
 * @class Watch a relayer market and put the events into a data store
 * It emits two events:
 * - `sync` when it is caught up to the market
 * - `end` when it is no longer connected to the market
 */
class MarketWatcher extends EventEmitter {
  /**
   * Set up the watcher
   * @param  {grpc.ServerStreaming} watcher        Stream of events from the Relayer
   * @param  {Sublevel}             store          Leveldb compatible store
   * @param  {Object}               RESPONSE_TYPES Response types from the proto file
   * @param  {Object} logger
   * @return {MarketWatcher}
   */
  constructor (watcher, store, RESPONSE_TYPES, logger) {
    super()
    this.watcher = watcher
    this.store = store
    this.migrating = null
    this.logger = logger
    this.RESPONSE_TYPES = RESPONSE_TYPES

    this.setupListeners()

    // initialize the checksum and hold off on processing
    // events until it is complete
    this.creatingChecksum = this.createChecksum()
  }

  /**
   * Delete every event in the store and set a promise on `migrating` that resolves once deletion is complete.
   * @return {Promise} Resolves when migration is complete
   */
  migrate () {
    this.logger.debug(`Removing existing orderbook events as part of migration`)
    this.migrating = migrateStore(this.store, this.store, (key) => { return { type: 'del', key } })
    return this.migrating
  }

  /**
   * Set up the listeners on the watcher
   * @private
   * @return {void}
   */
  setupListeners () {
    // Tear down listeners when the watcher completes
    const removeWatcherListeners = () => {
      this.watcher.removeAllListeners()
      this.removeListener('end', removeWatcherListeners)
      this.removeListener('error', removeWatcherListeners)
    }
    this.on('end', removeWatcherListeners)
    this.on('error', removeWatcherListeners)

    this.watcher.on('end', () => {
      this.logger.error('Remote ended stream')
      this.emit('end', new Error('Remote ended stream'))
    })

    this.watcher.on('error', (err) => {
      this.logger.error('Relayer watchMarket grpc failed', err)
      this.emit('end', err)
    })

    this.watcher.on('data', (response) => {
      this.handleResponse(response)
    })
  }

  /**
   * Create a new checksum by processing all market events in the data store
   * @todo does it make sense to build this off the index so we don't have
   * to process every event in the store?
   * @return {Promise} Resolves when the checksum is built
   */
  createChecksum () {
    this.checksum = new Checksum()

    return eachRecord(this.store, (key, value) => {
      const marketEvent = MarketEvent.fromStorage(key, value)
      this.checksum.process(marketEvent.orderId)
    })
  }

  /**
   * Handle an inbound event from the Relayer
   * @private
   * @param  {Object} response Response from the Relayer stream
   * @return {void}
   */
  async handleResponse (response) {
    const { RESPONSE_TYPES } = this

    // TODO: If more than one event is handled by this function during a migration,
    // it's unclear if the order that they actually get processed in (e.g. via `createMarketEvent`)
    // will be the same as the order in which they arrive.
    // This could have some potential issues, particularly if, for example, a CANCELLED is processed
    // before its corresponding PLACED.
    await this.delayProcessing()

    this.logger.debug(`response type is ${response.type}`)

    if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.START_OF_EVENTS) {
      this.migrate()
    } else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENT) {
      this.createMarketEvent(response)
    } else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
      this.upToDate(response)
    } else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.NEW_EVENT) {
      this.createMarketEvent(response)

      // we don't wait for `createMarketEvent` to return
      // before validating the checksum so as to avoid a race condition.
      this.validateChecksum(response.checksum)
    } else {
      this.logger.debug(`Unknown response type: ${response.type}`)
    }
  }

  /**
   * Helper promise to await to ensure that any outstanding promises are complete before proceeding
   * @private
   * @return {Promise} Resolves when there are no in-progress promises
   */
  async delayProcessing () {
    this.logger.debug(`Waiting for migration and checksum to finish before acting on new response`)
    await Promise.all([this.migrating, this.creatingChecksum])
  }

  /**
   * Store a market event
   * @private
   * @param  {Object} response Response from the Relayer
   * @param  {Object} response.marketEvent Market Event to be created
   * @return {Promise<void>}
   */
  async createMarketEvent ({ marketEvent }) {
    this.logger.debug('Creating a market event', marketEvent)
    const { key, value, orderId } = new MarketEvent(marketEvent)

    // add the market event to the checksum before storing
    // so that it is optimistically up to date and can be validated
    // without race conditions. If it fails to save, we will nuke
    // the entire sync.
    this.logger.debug('Adding market event to local checksum', { orderId })
    this.checksum.process(orderId)

    try {
      await promisify(this.store.put)(key, value)
    } catch (e) {
      // if we weren't able to persist the event we won't be in a good
      // state
      this.logger.error('Saving market event failed, invalidating sync', { orderId })
      this.emit('error', e)
    }
  }

  /**
   * Emit an event when the watcher is up to date
   * @private
   * @return {void}
   */
  upToDate ({ checksum }) {
    if (this.validateChecksum(checksum)) {
      this.logger.debug('Up to date with market')
      this.emit('sync')
    }
  }

  /**
   * Validate that a given checksum matches our internal
   * checksum, and trigger a re-sync if it does not
   * @private
   * @param  {String}  checksum Base64 string of the bytes of a checksum
   * @return {Boolean}          TRUE if the checksum matches, otherwise FALSE
   */
  validateChecksum (checksum) {
    this.logger.debug('Validating checksum', { checksum })

    if (!this.checksum.check(Buffer.from(checksum, 'base64'))) {
      // TODO: do we need to remove events from the db?
      this.logger.error('Checksums did not match, invalidating')
      this.emit('error', new Error('[MarketWatcher]: Checksum mismatch'))
      return false
    }

    return true
  }
}

module.exports = MarketWatcher
