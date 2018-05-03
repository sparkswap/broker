const sublevel = require('sublevel')
const EventEmitter = require('events')
const RelayerClient = require('../relayer')
const SingleMarketEventManager = require('./single-market-event-manager')

/*
 * Class for managing market events
 * Responsible for:
 * - managing connections to the relayer to retrieve events
 * - refreshing feeds
 * - serving market data to consumers
 * - storing market data
 *
 * @author kinesis
 */

// TODO: validation on market names
class MarketEventManager extends EventEmitter {
  constructor (store, logger) {
    super()
    this.relayer = new RelayerClient()
    this.store = store
    this.logger = logger
    this.markets = {}

    // automatically create an event manager when there is a new listener for
    // that market's events
    this.on('newListener', (event) => {
      if (event.startsWith('market:')) {
        const marketName = event.split(':'[1])
        if (!this.markets[marketName]) {
          this.createEventManager(marketName)
        }
      }
    })

    // if no listeners remain for a market, destroy it
    this.on('removeListener', (event) => {
      if (event.startsWith('market:')) {
        const marketName = event.split(':'[1])
        if (this.listenerCount(event) <= 0) {
          this.destroyEventManager(marketName)
        }
      }
    })
  }

  getEventManager (marketName) {
    if (!this.markets[marketName]) {
      this.createEventManager(marketName)
    }

    return this.markets[marketName]
  }

  createEventManager (marketName) {
    this.markets[marketName] = new SingleMarketEventManager(
      marketName,
      this.relayer,
      sublevel(this.store, marketName),
      this,
      this.logger
    )
  }

  destroyEventManager (marketName) {
    if (this.markets[marketName]) {
      if (this.markets[marketName].watcher) {
        this.markets[marketName].watcher.cancel()
      }
      this.markets[marketName] = null
    }
  }

  async getState (marketName) {
    return this.getEventManager(marketName).getState()
  }
}

module.exports = MarketEventManager
