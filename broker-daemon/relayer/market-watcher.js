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
    this.RESPONSE_TYPES

    this.setupListeners()
  }

  /**
   * Set up the listeners on the watcher
   * @return {void}
   */
  setupListeners () {
    // Tear down listeners when the watcher completes
    this.on('end', () => {
      this.removeAllListeners()
      this.watcher.removeAllListeners()
    })

    this.watcher.on('end', () => {
      this.logger.error('Remote ended stream')
      this.emit('end', new Error('Remote ended stream'))
    })

    this.watcher.on('error', (err) => {
      this.logger.error('Relayer watchMarket grpc failed', err)
      this.emit('end', err)
    })

    this.watcher.on('data', (repsonse) => {
      this.handleResponse(response)
    })
  }

  /**
   * Handle an inbound event from the Relayer
   * @param  {Object} response Response from the Relayer stream
   * @return {void}
   */
  async handleResponse (response) {
    const { RESPONSE_TYPES } = this

    await this.migration()

    this.logger.debug(`response type is ${response.type}`)

    if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
      this.upToDate()
    } else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.START_OF_EVENTS) {
      this.migrate()
    } else if ([RESPONSE_TYPES.EXISTING_EVENT, RESPONSE_TYPES.NEW_EVENT].includes(RESPONSE_TYPES[response.type])) {
      this.createMarketEvent(response)
    } else {
      this.logger.debug(`Unknown response type: ${response.type}`)
    }
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
   * Helper promise to await to ensure that any migrations are complete before proceeding
   * @return {Promise} Resolves when there are no in-progress migrations
   */
  async migration () {
    // migrating is falsey (null) by default
    if (this.migrating) {
      this.logger.debug(`Waiting for migration to finish before acting on new response`)
      await this.migrating
    }
    return
  }

  /**
   * Store a market event
   * @param  {Object} response Response from the Relayer
   * @return {void}
   */
  createMarketEvent (response) {
    const { marketEvent } = response

    this.logger.debug('Creating a market event', marketEvent)

    const { key, value } = new MarketEvent(marketEvent)
    this.store.put(key, value)
  }

  /**
   * Emit an event when the watcher is up to date
   * @return {void}
   */
  upToDate () {
    this.logger.debug(`Up to date with market`)
    this.emit('sync')   
  }
}

module.exports = MarketWatcher