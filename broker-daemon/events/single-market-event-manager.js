const { MarketEvent } = require('../models')

const RESPONSE_TYPES = Object.freeze({
  NEW_EVENT: 'NEW_EVENT',
  EXISTING_EVENT: 'EXISTING_EVENT',
  EXISTING_EVENTS_DONE: 'EXISTING_EVENTS_DONE'
})

class SingleMarketEventManager {
  constructor (marketName, relayer, store, emitter, logger) {
    this.marketName = marketName
    this.relayer = relayer
    this.store = store
    this.emitter = emitter
    this.logger = logger
    this.state = []
    this.lastUpdate = null
  }

  get symbols () {
    const [ baseSymbol, counterSymbol ] = this.marketName.split('/')

    return { baseSymbol, counterSymbol }
  }

  get baseSymbol () {
    return this.symbols.baseSymbol
  }

  get counterSymbol () {
    return this.symbols.counterSymbol
  }

  modifyState (event) {
    this.lastUpdate = event.timestamp

    if (event.type === MarketEvent.TYPES.PLACED) {
      // Are we in danger of running out of memory here?
      this.state.push(event)
    } else {
      const index = this.state.findIndex(ev => ev.orderId === event.orderId)
      if(index === -1) {
        throw new Error('Attempting to remove order that does not exist.')
      }
      this.state.splice(index, 1)
    }
  }

  getState () {
    if (!this._savedStateLoaded || !this._remoteStateLoaded) {
      throw new Error(`Cannot get current state of ${this.marketName} until the saved and remote state are loaded.`)
    }

    return this.state
  }

  async loadState() {
    await this.loadSavedState()
    await this.monitor()
    this.emitter.emit(`market:${this.marketName}:loaded`)
  }

  // Do we need to wait for this to load before doing other things?
  loadSavedState () {
    return new Promise((resolve, reject) => {
      this._savedStateLoaded = false
      const eventStream = this.store.createReadStream()
      eventStream.on('data', (key, value) => this.modifyState(MarketEvent.fromStorage(key, value)))
      eventStream.on('error', reject)
      eventStream.on('end', () => {
        this._savedStateLoaded = true
        resolve(this.state)
      })
    })
  }

  /**
   * Connects to the relayer, stores market events, and publishes them to listeners
   *
   * @returns {Promise<void>} A promise that resolves once the local is caught up to the remote
   */
  monitor () {
    return new Promise(async (resolve, reject) => {
      if(!this._savedStateLoaded) {
        return reject(new Error(`Cannot start monitoring ${this.marketName} until saved state has been loaded.`))
      }

      this._remoteStateLoaded = false

      const { baseSymbol, counterSymbol, lastUpdate } = this
      // TODO: fix null value for lastUpdate
      const request = { baseSymbol, counterSymbol, lastUpdate }

      this.logger.info('Setting up market watcher', request)

      try {
        this.watcher = await this.relayer.watchMarket(request)
      } catch(e) {
        return reject(e)
      }

      this.watcher.on('end', () => {
        this.logger.info('Remote ended stream', request)
        // TODO: retry stream?
        throw new Error(`Remote relayer ended stream for ${this.marketName}`)
      })

      this.watcher.on('data', async (response) => {
        if(response.type === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
          this._remoteStateLoaded = true
          return resolve()
        }

        if(![RESPONSE_TYPES.EXISTING_EVENT, RESPONSE_TYPES.NEW_EVENT].includes(response.type)) {
          // No other responses are implemented
          return;
        }

        const event = new MarketEvent(response.martketEvent)
        await this.store.put(event.key, event.value)
        this.modifyState(event)

        if(response.type === RESPONSE_TYPES.NEW_EVENT) {
          this.emitter.emit(`market:${this.marketName}`, event)
        }
      })
    })
  }
}

module.exports = SingleMarketEventManager
