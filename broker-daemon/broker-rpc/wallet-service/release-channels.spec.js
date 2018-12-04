const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const releaseChannels = rewire(path.resolve(__dirname, 'release-channels'))

describe('releaseChannels', () => {
  let params
  let logger
  let res
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
      res = await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
    })

    it('attempts to close channels on the base engine', async () => {
      expect(baseEngineStub.closeChannels).to.have.been.called()
    })

    it('attempts to close channels on the counter engine', async () => {
      expect(counterEngineStub.closeChannels).to.have.been.called()
    })

    it('returns a ReleaseChannelsResponse', async () => {
      expect(ReleaseChannelsResponse).to.have.been.called()
      expect(res).to.be.eql({})
    })
  })

  describe('force releasing channels from a specific market', () => {
    beforeEach(async () => {
      params.force = true
      res = await releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse })
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
})
