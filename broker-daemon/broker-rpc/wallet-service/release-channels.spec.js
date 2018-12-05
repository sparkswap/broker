const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const releaseChannels = rewire(path.resolve(__dirname, 'release-channels'))

describe('releaseChannels', () => {
  let params
  let logger
  let engines
  let orderbooks
  let baseEngineStub
  let counterEngineStub
  let ReleaseChannelsResponse

  beforeEach(() => {
    ReleaseChannelsResponse = sinon.stub()
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    params = { market: 'BTC/LTC' }
    orderbooks = new Map([['BTC/LTC', { store: sinon.stub() }]])
    baseEngineStub = { closeChannels: sinon.stub().resolves([{chan: 'channel'}]) }
    counterEngineStub = { closeChannels: sinon.stub().resolves([{chan: 'counterchannel'}, {chan: 'counterchannel'}]) }
    engines = new Map([['BTC', baseEngineStub], ['LTC', counterEngineStub]])
  })

  describe('release channels from a specific market', () => {
    beforeEach(async () => {
    })

    it('attempts to close channels on the base engine', async () => {
      await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
      expect(baseEngineStub.closeChannels).to.have.been.called()
    })

    it('attempts to close channels on the counter engine', async () => {
      await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
      expect(counterEngineStub.closeChannels).to.have.been.called()
    })

    it('returns an successful ReleaseChannelsResponse', async () => {
      await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
      const expectedRes = {
        channels: []
      }
      const { RELEASED } = releaseChannels.__get__('RELEASE_STATE')
      for (var entry of engines.entries()) {
        const [symbol] = entry
        expectedRes.channels.push({
          symbol,
          status: RELEASED
        })
      }
      expect(ReleaseChannelsResponse).to.have.been.calledWith(expectedRes)
    })
  })

  describe('force releasing channels from a specific market', () => {
    beforeEach(async () => {
      params.force = true
      await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
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
      return expect(releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })).to.eventually.be.rejectedWith(errorMessage)
    })

    it('throws an error if the base engine does not exist for symbol', () => {
      engines = new Map([['LTC', counterEngineStub]])
      return expect(
        releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
      ).to.eventually.be.rejectedWith(PublicError, `No engine available for BTC`)
    })

    it('throws an error if the counter engine does not exist for symbol', () => {
      engines = new Map([['BTC', baseEngineStub]])
      return expect(
        releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
      ).to.be.rejectedWith(PublicError, `No engine available for LTC`)
    })
  })

  context('errors while trying to close base engine channels', () => {
    it('returns an error in the response', async () => {
      const { RELEASED, FAILED } = releaseChannels.__get__('RELEASE_STATE')
      const error = 'BTC engine is locked'
      baseEngineStub.closeChannels.rejects(error)
      await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })

      const expectedResponse = {
        channels: [
          { symbol: 'BTC', error, status: FAILED },
          { symbol: 'LTC', status: RELEASED }
        ]
      }
      expect(ReleaseChannelsResponse).to.have.been.calledWith(expectedResponse)
    })
  })
})
