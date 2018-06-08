const { MarketEvent, MarketEventOrder } = require('../models')
const { AskIndex, BidIndex } = require('./price-indexes')
const { getRecords } = require('../utils')
const MAX_VALUE = '9223372036854775807'
const PAD_SIZE = 32
const DECIMAL_PLACES = 16

class Orderbook {
  constructor (marketName, relayer, store, logger = console) {
    this.marketName = marketName
    this.relayer = relayer
    this.eventStore = store.sublevel('events')
    this.store = Orderbook.createStore(store, this.eventStore)
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

  // should this be a static?
  /**
   * Creates a sublevel store that tracks an eventStore to create an orderbook
   *
   * @returns {sublevel} A store that contains the orderbook built from the event store
   */
  static createStore (baseStore, eventStore) {
    const store = baseStore.sublevel('orderbook')

    eventStore.pre((dbOperation, add) => {
      if (dbOperation.type !== 'put') {
        return
      }
      const event = MarketEvent.fromStorage(dbOperation.key, dbOperation.value)
      const order = MarketEventOrder.fromEvent(event)

      if (event.eventType === MarketEvent.TYPES.PLACED) {
        add({ key: order.key, value: order.value, type: 'put', prefix: store })
      } else {
        add({ key: order.key, type: 'del', prefix: store })
      }
    })

    return store
  }
}

module.exports = Orderbook
