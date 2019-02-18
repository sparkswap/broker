const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const releaseChannels = rewire(path.resolve(__dirname, 'release-channels'))

describe('releaseChannels', () => {
  let params
  let logger
  let engines
  let orderbooks
  let blockOrderWorker
  let baseEngineStub
  let counterEngineStub
  let ReleaseChannelsResponse
  let cancelledOrders
  let failedToCancelOrders

  beforeEach(() => {
    ReleaseChannelsResponse = sinon.stub()
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    params = { market: 'BTC/LTC' }
    orderbooks = new Map([['BTC/LTC', { store: sinon.stub() }]])
    cancelledOrders = ['asdfasdf', 'asdfwerw']
    failedToCancelOrders = ['gsdgsdgsg']
    blockOrderWorker = {
      cancelActiveOrders: sinon.stub().resolves({ cancelledOrders, failedToCancelOrders })
    }
    baseEngineStub = { closeChannels: sinon.stub().resolves([{ chan: 'channel' }]) }
    counterEngineStub = { closeChannels: sinon.stub().resolves([{ chan: 'counterchannel' }, { chan: 'counterchannel' }]) }
    engines = new Map([['BTC', baseEngineStub], ['LTC', counterEngineStub]])
  })

  describe('release channels from a specific market', () => {
    beforeEach(async () => {
      await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })
    })

    it('attempts to close channels on the base engine', async () => {
      expect(baseEngineStub.closeChannels).to.have.been.called()
    })

    it('attempts to close channels on the counter engine', async () => {
      expect(counterEngineStub.closeChannels).to.have.been.called()
    })

    it('returns a successful ReleaseChannelsResponse', async () => {
      const { RELEASED } = releaseChannels.__get__('RELEASE_STATE')
      const expectedRes = {
        base: { symbol: 'BTC', status: RELEASED },
        counter: { symbol: 'LTC', status: RELEASED }
      }
      expect(ReleaseChannelsResponse).to.have.been.calledWith(expectedRes)
    })
  })

  describe('cancelling orders on the market', () => {
    it('cancels all orders on the market', async () => {
      await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })
      expect(blockOrderWorker.cancelActiveOrders).to.have.been.calledWith(params.market)
    })

    context('logging cancelled orders', async () => {
      it('logs successfully cancelled orders', async () => {
        await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })
        expect(logger.info).to.have.been.calledWith('Successfully cancelled orders', { orders: cancelledOrders })
      })

      it('does not log success if none were successfully cancelled', async () => {
        blockOrderWorker.cancelActiveOrders.resolves({ cancelledOrders: [], failedToCancelOrders })
        await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })

        expect(logger.info).to.not.have.been.calledWith('Successfully cancelled orders', { orders: [] })
      })
    })

    context('logging failed to cancel orders', async () => {
      it('logs orders that could not be cancelled', async () => {
        await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })

        expect(logger.info).to.have.been.calledWith('Failed to cancel orders', { orders: failedToCancelOrders })
      })

      it('does not log failure if no orders failed to cancel', async () => {
        blockOrderWorker.cancelActiveOrders.resolves({ cancelledOrders, failedToCancelOrders: [] })
        await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })

        expect(logger.info).to.not.have.been.calledWith('Failed to cancel orders', { orders: [] })
      })
    })
  })

  describe('force releasing channels from a specific market', () => {
    beforeEach(async () => {
      params.force = true
      await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })
    })

    it('force closes channels on the base engine', async () => {
      expect(baseEngineStub.closeChannels).to.have.been.called({ force: true })
    })

    it('force closes channels on the counter engine', async () => {
      expect(counterEngineStub.closeChannels).to.have.been.calledWith({ force: true })
    })
  })

  describe('invalid market and engine types', () => {
    it('throws an error if the market does not exist in the orderbook', () => {
      orderbooks = new Map([['ABC/DXS', { store: sinon.stub() }]])

      const errorMessage = `${params.market} is not being tracked as a market.`
      return expect(releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })).to.eventually.be.rejectedWith(errorMessage)
    })

    it('throws an error if the base engine does not exist for symbol', () => {
      engines = new Map([['LTC', counterEngineStub]])
      return expect(
        releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })
      ).to.eventually.be.rejectedWith(PublicError, `No engine available for BTC`)
    })

    it('throws an error if the counter engine does not exist for symbol', () => {
      engines = new Map([['BTC', baseEngineStub]])
      return expect(
        releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })
      ).to.be.rejectedWith(PublicError, `No engine available for LTC`)
    })
  })

  context('errors while trying to close base engine channels', () => {
    it('returns an error in the response', async () => {
      const { RELEASED, FAILED } = releaseChannels.__get__('RELEASE_STATE')
      const error = new Error('BTC engine is locked')
      baseEngineStub.closeChannels.rejects(error)
      await releaseChannels({ params, logger, engines, orderbooks, blockOrderWorker }, { ReleaseChannelsResponse })

      const expectedResponse = {
        base: { symbol: 'BTC', error: error.message, status: FAILED },
        counter: { symbol: 'LTC', status: RELEASED }
      }
      expect(ReleaseChannelsResponse).to.have.been.calledWith(expectedResponse)
    })
  })
})
