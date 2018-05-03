const { promiseOnce } = require('../utils')
const { MarketEvent } = require('../models')

class SingleMarketEventManager {
  constructor (marketName, relayer, store, emitter, logger) {
    this.marketName = marketName
    this.relayer = relayer
    this.store = store
    this.emitter = emitter
    this.logger = logger
    this.state = []

    this.loadCurrentState()
    this.monitor()
  }

  get baseSymbol () {
    return this.marketName.split('/')[0]
  }

  get counterSymbol () {
    return this.marketName.split('/')[1]
  }

  async modifyState (event, force) {
    if (event.type === MarketEvent.TYPES.PLACED) {
      this.addToState(event, force)
    } else {
      this.removeFromState(event, force)
    }
  }

  async getState () {
    if (!this._currentStateLoaded) {
      await promiseOnce(this.emitter, `__market:${this.marketName}:loaded`)
    }

    return this.state
  }

  // Are we in danger of running out of memory here?
  addToState (event, force = false) {
    if (force || this._currentStateLoaded) {
      this.state.push(event)
    } else {
      this._addBuffer.push(event)
    }
  }

  removeFromState (event, force = false) {
    if (force || this._currentStateLoaded) {
      // TODO: input checking here?
      // what if the event is not in here? Would we remove the last item in the last (index -1)?
      const index = this.state.findIndex(ev => ev.orderId === event.orderId)
      this.state.splice(index, 1)
    } else {
      this._removeBuffer.push(event)
    }
  }

  // Do we need to wait for this to load before doing other things?
  loadCurrentState () {
    this._currentStateLoaded = false
    this._addBuffer = []
    this._removeBuffer = []
    const eventStream = this.store.createReadStream()
    eventStream.on('data', (key, value) => this.modifyState(MarketEvent.fromStorage(key, value)))
    eventStream.on('end', () => {
      this._currentStateLoaded = true

      this._addBuffer.forEach(event => this.addToState(event))
      this._addBuffer = []
      this._removeBuffer.forEach(event => this.removeFromState(event))
      this._removeBuffer = []

      this.emitter.emit(`__market:${this.marketName}:loaded`)
    })
  }

  /**
   * Connects to the relayer, stores market events, and publishes them to listeners
   *
   * @returns {void}
   */
  async monitor () {
    if (!this.watcher) {
      const lastUpdate = await this.lastUpdate()
      const { baseSymbol, counterSymbol } = this
      // TODO: fix null value for lastUpdate
      const request = { baseSymbol, counterSymbol, lastUpdate }

      this.logger.info('Setting up market watcher', request)
      this.watcher = await this.relayer.watchMarket(request)

      this.watcher.on('end', () => {
        this.watcher = null
        this.logger.info('Done watching', request)
      })

      // TODO: fire some event when we are up and listening so we know we have fresh data

      this.watcher.on('data', async (data) => {
        const event = new MarketEvent(data)
        await this.store.put(event.key, event.value)
        this.publish(event)
      })
    }
  }

  publish (event) {
    this.modifyState(event)
    this.emitter.emit(`market:${this.marketName}`, event)
  }

  /**
   * Gets the last time this market was updated with data from the relayer
   *
   * @returns {Promise<number>} A promise that contains the timestamp of the last update, or null if no update exists
   */
  lastUpdate () {
    return new Promise((resolve, reject) => {
      let timestamp

      this.store.createReadStream({
        reverse: true,
        limit: 1
      })
        .on('data', ({ key, value }) => {
          const event = MarketEvent.fromStorage(key, value)
          timestamp = event.timestamp
        })
        .on('error', (err) => {
          reject(err)
        })
        .on('end', () => {
          if (!timestamp) {
            return resolve(null)
          }

          resolve(timestamp)
        })
    })
  }
}

module.exports = SingleMarketEventManager
