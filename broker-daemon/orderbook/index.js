const { MarketEvent, MarketEventOrder } = require('../models')
const AskIndex = require('./ask-index')
const BidIndex = require('./bid-index')
const OrderbookIndex = require('./orderbook-index')
const { getRecords, Big } = require('../utils')
const nano = require('nano-seconds')

const consoleLogger = console
consoleLogger.debug = console.log.bind(console)

/**
 * Time, in milliseconds, between tries to get the market events from
 * the Relayer.
 * @constant
 * @type {Number}
 */
const RETRY_WATCHMARKET = 5000

/**
 * @class Current state of the orderbook in a particular market
 */
class Orderbook {
  /**
   * Create a new orderbook for a given market
   * @param  {String}        marketName Name of the market to track, e.g. `BTC/LTC`
   * @param  {RelayerClient} relayer    Client to connect to the Relayer
   * @param  {Sublevel}      store      Sublevel-compatible data store
   * @param  {Object}        logger
   * @return {Orderbook}
   */
  constructor (marketName, relayer, store, logger = consoleLogger) {
    this.marketName = marketName
    this.relayer = relayer
    this.eventStore = store.sublevel('events')
    this.index = new OrderbookIndex(store, this.eventStore, this.marketName)
    this.store = this.index.store
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
   * Also includes retry logic if the Relayer fails.
   * @return {void}
   */
  async initialize () {
    this.logger.info(`Initializing market ${this.marketName}...`)
    this.synced = false

    const { baseSymbol, counterSymbol } = this
    const { lastUpdated, sequence } = await this.lastUpdate()
    const params = { baseSymbol, counterSymbol, lastUpdated, sequence }

    const watcher = this.relayer.watchMarket(this.eventStore, params)

    watcher.on('sync', async () => {
      this.logger.debug(`Rebuilding indexes`)
      await this.index.ensureIndex()
      this.askIndex = await (new AskIndex(this.store)).ensureIndex()
      this.bidIndex = await (new BidIndex(this.store)).ensureIndex()

      this.synced = true
      this.logger.info(`Market ${this.marketName} initialized.`)
    })

    watcher.on('end', (error) => {
      this.logger.info(`Market ${this.marketName} unavailable, retrying in ${RETRY_WATCHMARKET}ms`, { error })

      // TODO: exponential backoff?
      setTimeout(() => {
        this.initialize()
      }, RETRY_WATCHMARKET)
    })
  }

  /**
   * Returns all records in the current orderbook
   *
   * @returns {Promise<Array<MarketEventOrder>>} A promise that resolves an array of MarketEventOrder records
   */
  async all () {
    this.assertSynced()
    this.logger.info(`Retrieving all records for ${this.marketName}`)
    return getRecords(this.store, MarketEventOrder.fromStorage.bind(MarketEventOrder))
  }

  /**
   * Gets all trades for a specific timestamp
   *
   * @param  {String} since - ISO8601 datetime lowerbound
   * @param  {Integer} limit - limit of records returned
   * @return {Array<Object>} trades
   */
  async getTrades (since, limit) {
    this.assertSynced()
    const params = {limit}
    if (since) {
      const sinceDate = new Date(since).toISOString()
      params.gte = nano.toString(nano.fromISOString(sinceDate))
    }
    const trades = await getRecords(this.eventStore, MarketEvent.fromStorage.bind(MarketEvent), params)
    return trades
  }

  /**
   * @typedef {Object} BestOrders
   * @property {String} depth Int64 string of the total depth represented by the orders
   * @property {Array<MarketEventOrder>} orders Array of the best market event orders
   */

  /**
   * get the best price orders in the orderbook
   * @param  {String} options.side  Side of the orderbook to get the best priced orders for (i.e. `BID` or `ASK`)
   * @param  {String} options.depth int64 String of the amount, in base currency base units to ge the best prices up to
   * @param  {String} options.quantumPrice Decimal String of the price that all orders should be better than
   * @return {Promise<BestOrders>} A promise that resolves MarketEventOrders of the best priced orders
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
   * Gets current orderbook events by timestamp
   *
   * @param {String} timestamp - timestamp in nano-seconds
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
   * @param {String} timestamp - timestamp in nano-seconds
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
   * @return {void}
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
   * @returns {String} [lastUpdated=0] - nanosecond timestamp
   * @returns {String} [sequence=0] - event version for a given timestamp
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
