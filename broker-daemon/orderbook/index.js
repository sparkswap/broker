const { MarketEvent, MarketEventOrder } = require('../models')
const AskIndex = require('./ask-index')
const BidIndex = require('./bid-index')
const OrderbookIndex = require('./orderbook-index')
const { getRecords, Big } = require('../utils')
const nano = require('nano-seconds')

const consoleLogger = console
consoleLogger.debug = console.log.bind(console)

/**
 * Maximum time, in milliseconds, between tries to get the
 * market events from the Relayer.
 * @constant
 * @type {number}
 * @default
 */
const MAX_RETRY_INTERVAL = 60000

/**
 * @class Current state of the orderbook in a particular market
 */
class Orderbook {
  /**
   * Create a new orderbook for a given market
   * @param  {string}        marketName - Name of the market to track, e.g. `BTC/LTC`
   * @param  {RelayerClient} relayer    - Client to connect to the Relayer
   * @param  {Sublevel}      store      - Sublevel-compatible data store
   * @param  {Object}        logger
   */
  constructor (marketName, relayer, store, logger = consoleLogger) {
    this.marketName = marketName
    this.relayer = relayer
    this.eventStore = store.sublevel('events')
    this.index = new OrderbookIndex(store, this.eventStore, this.marketName)
    this.store = this.index.store
    this.askIndex = new AskIndex(this.store)
    this.bidIndex = new BidIndex(this.store)
    this.logger = logger
    this.synced = false
  }

  get baseSymbol () {
    return this.marketName.split('/')[0]
  }

  get counterSymbol () {
    return this.marketName.split('/')[1]
  }

  /**
   * Initialize the orderbook by syncing its state to the Relayer and indexing
   * the orders.
   * @returns {void}
   */
  async initialize () {
    this.logger.info(`Initializing market ${this.marketName}...`)
    this.synced = false

    this.logger.debug(`Rebuilding indexes`)
    await this.index.ensureIndex()
    await this.askIndex.ensureIndex()
    await this.bidIndex.ensureIndex()

    await this.watchMarket()
  }

  /**
   * Sync orderbook state with the Relayer and retry when it fails
   * @private
   * @param {number} [retries=0] - number of times end events have been handled without success
   * @returns {Promise} Resolves when market is being watched (not necessarily when it is synced)
   */
  async watchMarket (retries = 0) {
    this.logger.debug(`Watching market ${this.marketName}...`)

    const { baseSymbol, counterSymbol } = this
    const { lastUpdated, sequence } = await this.lastUpdate()
    const params = { baseSymbol, counterSymbol, lastUpdated, sequence }

    const watcher = this.relayer.watchMarket(this.eventStore, params)

    /**
     * Handle sync events from the watcher by updating internal state
     * @returns {void}
     */
    const onWatcherSync = () => {
      this.synced = true
      retries = 0
      this.logger.info(`Market ${this.marketName} synced.`)
    }

    /**
     * Handle end events from the watcher by retrying
     * @param {Error} error
     * @returns {void}
     */
    const onWatcherEnd = (error) => {
      this.synced = false
      watcher.removeListener('sync', onWatcherSync)
      watcher.removeListener('error', onWatcherError)

      // Calculate the exponential backoff delay interval using the binary exponential backoff algorithm
      // defined in https://en.wikipedia.org/wiki/Exponential_backoff
      //
      // Note: Repeated retransmission wait time is typically defined as a random variable between
      // 0 and 2^c - 1, where c is the number of retries, however here we increase delay time using
      // 2^c - 1 until MAX_RETRY_INTERVAL is reached.
      retries++
      const delay = Math.min((2 ** retries - 1) * 1000, MAX_RETRY_INTERVAL)

      this.logger.info(`Market ${this.marketName} unavailable, retrying in ${delay}ms`, { error })
      setTimeout(() => this.watchMarket(retries), delay)
    }

    /**
     * Handle error events from the watcher by clearing our store and retrying
     * @param {Error} error
     * @returns {void}
     */
    const onWatcherError = async (error) => {
      this.synced = false

      watcher.removeListener('sync', onWatcherSync)
      watcher.removeListener('end', onWatcherEnd)

      this.logger.info(`Market ${this.marketName} encountered sync'ing error, re-building`, { error })
      await watcher.migrate()
      await this.index.ensureIndex()
      this.watchMarket()
    }

    watcher.once('sync', onWatcherSync)
    watcher.once('end', onWatcherEnd)
    watcher.once('error', onWatcherError)
  }

  /**
   * Gets all trades for a specific timestamp
   *
   * @param {string} since - ISO8601 datetime lowerbound
   * @param {number} limit - limit of records returned
   * @returns {Array<Object>} trades
   */
  async getTrades (since, limit) {
    this.assertSynced()
    const params = { limit }
    if (since) {
      const sinceDate = new Date(since).toISOString()
      params.gte = nano.toString(nano.fromISOString(sinceDate))
    }
    const trades = await getRecords(this.eventStore, MarketEvent.fromStorage.bind(MarketEvent), params)
    return trades
  }

  /**
   * Get orders in the orderbook for a given side up to a given limit. If no limit is provided, gets all orders
   * @param {Object} args
   * @param {string} args.side - Side of the orderbook to get orders for (i.e. `BID` or `ASK`)
   * @param {string} args.limit - int64 String of the the amount of orders to return.
   * @returns {Array<MarketEventOrder>} A promise that resolves MarketEventOrders for the limited records
   */
  getOrders ({ side, limit }) {
    this.assertSynced()
    this.logger.info('Retrieving records from orderbook', { side, limit })

    const params = {}

    if (limit) {
      params.limit = parseInt(limit, 10)
    }

    if (!MarketEventOrder.SIDES[side]) {
      throw new Error(`${side} is not a valid market side`)
    }

    const index = side === MarketEventOrder.SIDES.BID ? this.bidIndex : this.askIndex
    return getRecords(index, (key, value) => {
      return MarketEventOrder.fromStorage(key, value)
    }, params)
  }

  /**
   * @typedef {Object} BestOrders
   * @property {String} depth Int64 string of the total depth represented by the orders
   * @property {Array<MarketEventOrder>} orders Array of the best market event orders
   */

  /**
   * get the best price orders in the orderbook
   * @param {Object} args
   * @param {string} args.side  - Side of the orderbook to get the best priced orders for (i.e. `BID` or `ASK`)
   * @param {string} args.depth - int64 String of the amount, in base currency base units to ge the best prices up to
   * @param {string} args.quantumPrice - Decimal String of the price that all orders should be better than
   * @returns {Promise<BestOrders>} A promise that resolves MarketEventOrders of the best priced orders
   */
  getBestOrders ({ side, depth, quantumPrice }) {
    this.assertSynced()
    return new Promise((resolve, reject) => {
      this.logger.info(`Retrieving best priced from ${side} up to ${depth}`)

      if (!MarketEventOrder.SIDES[side]) {
        return reject(new Error(`${side} is not a valid market side`))
      }

      let resolved = false
      const orders = []

      const targetDepth = Big(depth)
      let currentDepth = Big('0')

      function finish () {
        // AFAIK, this is the best way to stop a stream in progress
        resolved = true
        stream.pause()
        stream.unpipe()

        resolve({ orders, depth: currentDepth.toString() })
      }

      const index = side === MarketEventOrder.SIDES.BID ? this.bidIndex : this.askIndex
      const stream = index.streamOrdersAtPriceOrBetter(quantumPrice)

      stream.on('error', reject)

      stream.on('end', () => {
        finish()
      })

      stream.on('data', ({ key, value }) => {
        if (resolved) return

        const order = MarketEventOrder.fromStorage(key, value)
        orders.push(order)

        currentDepth = currentDepth.plus(order.baseAmount)

        if (currentDepth.gte(targetDepth)) {
          finish()
        }
      })
    })
  }

  /**
   * get the average weighted price given the side and depth
   * @param {string} side  - Side of the orderbook to get the best priced orders for (i.e. `BID` or `ASK`)
   * @param {string} targetDepth - int64 String of the amount, in base currency base units to ge the best prices up to
   * @returns {number} The weighted average price
   */
  async getAveragePrice (side, targetDepth) {
    const { orders, depth } = await this.getBestOrders({ side, depth: targetDepth })
    if (Big(depth).lt(targetDepth)) {
      const params = {
        market: this.marketName,
        side: this.side,
        depth,
        targetDepth
      }
      this.logger.error('Insufficient depth to find averagePrice', params)
      throw new Error('Insufficient depth to find averagePrice', params)
    }
    targetDepth = Big(targetDepth)
    let currentDepth = Big(0)
    let weightedPrice = Big(0)
    orders.forEach((order) => {
      const depthRemaining = targetDepth.minus(currentDepth)

      // if we have already reached our target depth, return
      if (depthRemaining.lte(0)) {
        return
      }

      // Take the smaller of the remaining desired depth or the base amount of the order
      const fillAmount = depthRemaining.gt(order.baseAmount) ? order.baseAmount : depthRemaining.toString()
      // track our current depth so we know how much depth we have left
      currentDepth = currentDepth.plus(fillAmount)
      weightedPrice = weightedPrice.plus(Big(order.price).times(fillAmount))
    })
    return Big(weightedPrice).div(targetDepth)
  }

  /**
   * Gets current orderbook events by timestamp
   *
   * @param {string} timestamp - timestamp in nano-seconds
   * @returns {Array<MarketEventOrder>}
   */
  async getOrderbookEventsByTimestamp (timestamp) {
    this.assertSynced()
    return getRecords(
      this.store,
      (key, value) => JSON.parse(value),
      // Limits the query to gte to a specific timestamp
      MarketEvent.rangeFromTimestamp(timestamp)
    )
  }

  /**
   * Gets MarketEvents by timestamp
   *
   * @param {string} timestamp - timestamp in nano-seconds
   * @returns {Array<MarketEventOrder>}
   */
  async getMarketEventsByTimestamp (timestamp) {
    this.assertSynced()
    return getRecords(
      this.eventStore,
      (key, value) => JSON.parse(value),
      // Limits the query to gte to a specific timestamp
      MarketEvent.rangeFromTimestamp(timestamp)
    )
  }

  /**
   * Ensures that the orderbook is synced before accessing it
   * @private
   * @returns {void}
   * @throws {Error} If Orderbook is not synced to Relayer
   */
  assertSynced () {
    if (!this.synced) {
      throw new Error(`Cannot access Orderbook for ${this.marketName} until it is synced`)
    }
  }

  /**
   * Gets the last record in an event store
   * @private
   * @returns {MarketEvent}
   * @returns {Object} empty object if no record exists
   */
  async getLastRecord () {
    const [ lastEvent = {} ] = await getRecords(
      this.eventStore,
      MarketEvent.fromStorage.bind(MarketEvent),
      {
        reverse: true,
        limit: 1
      }
    )
    return lastEvent
  }

  /**
   * Gets the last time this market was updated with data from the relayer
   * @private
   * @returns {Object} res
   * @returns {string} [lastUpdated=0] - nanosecond timestamp
   * @returns {string} [sequence=0] - event version for a given timestamp
   */
  async lastUpdate () {
    this.logger.info(`Retrieving last update from store for ${this.marketName}`)

    const {
      timestamp: lastUpdated = '0',
      sequence = '0'
    } = await this.getLastRecord()

    return {
      lastUpdated,
      sequence
    }
  }
}

module.exports = Orderbook
