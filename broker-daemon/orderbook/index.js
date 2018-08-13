const { MarketEvent, MarketEventOrder } = require('../models')
const AskIndex = require('./ask-index')
const BidIndex = require('./bid-index')
const OrderbookIndex = require('./orderbook-index')
const { getRecords, Big } = require('../utils')
const consoleLogger = console
consoleLogger.debug = console.log.bind(console)

class Orderbook {
  constructor (marketName, relayer, store, logger = consoleLogger) {
    this.marketName = marketName
    this.relayer = relayer
    this.eventStore = store.sublevel('events')
    this.index = new OrderbookIndex(store, this.eventStore, this.marketName)
    this.store = this.index.store
    this.logger = logger
  }

  get baseSymbol () {
    return this.marketName.split('/')[0]
  }

  get counterSymbol () {
    return this.marketName.split('/')[1]
  }

  async initialize () {
    this.logger.info(`Initializing market ${this.marketName}...`)

    const { baseSymbol, counterSymbol } = this
    const lastUpdated = await this.lastUpdate()
    const params = { baseSymbol, counterSymbol, lastUpdated }

    await this.relayer.watchMarket(this.eventStore, params)

    this.logger.debug(`Rebuilding indexes`)
    await this.index.ensureIndex()
    this.askIndex = await (new AskIndex(this.store)).ensureIndex()
    this.bidIndex = await (new BidIndex(this.store)).ensureIndex()

    return this.logger.info(`Market ${this.marketName} initialized.`)
  }

  /**
   * Returns all records in the current orderbook
   *
   * @returns {Promise<Array<MarketEventOrder>>} A promise that resolves an array of MarketEventOrder records
   */
  async all () {
    this.logger.info(`Retrieving all records for ${this.marketName}`)
    return getRecords(this.store, MarketEventOrder.fromStorage.bind(MarketEventOrder))
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
   * Gets the last time this market was updated with data from the relayer
   *
   * @returns {Promise<number>} A promise that contains the timestamp of the last update, or null if no update exists
   */
  async lastUpdate () {
    this.logger.info(`Retrieving last update from store for ${this.marketName}`)
    const [ lastEvent ] = await getRecords(
      this.eventStore,
      MarketEvent.fromStorage.bind(MarketEvent),
      {
        reverse: true,
        limit: 1
      }
    )

    const timestamp = lastEvent ? lastEvent.timestamp : null

    this.logger.info(`Found last update of ${timestamp}`)

    return timestamp
  }
}

module.exports = Orderbook
