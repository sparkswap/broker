const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const releaseChannels = rewire(path.resolve(__dirname, 'release-channels'))

describe('releaseChannels', () => {
  let params
  let relayer
  let logger
  let res
  let engines
  let orderbooks
  let baseEngineStub
  let counterEngineStub

  beforeEach(() => {
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

  describe('committing a balance to the exchange', () => {
    beforeEach(async () => {
      res = await releaseChannels({ params, relayer, logger, engines, orderbooks })
    })

    it('attempts to close channels on the base engine', () => {
      expect(baseEngineStub.closeChannels).to.have.been.called()
    })

    it('attempts to close channels on the base engine', () => {
      expect(counterEngineStub.closeChannels).to.have.been.called()
    })

    it('returns a EmptyResponse', () => {
      expect(res).to.be.eql({})
    })
  })

  describe('invalid market and engine types', () => {
    it('throws an error if the market does not exist in the orderbook', () => {
      orderbooks = new Map([['ABC/DXS', { store: sinon.stub() }]])

      const errorMessage = `${params.market} is not being tracked as a market.`
      return expect(releaseChannels({ params, relayer, logger, engines, orderbooks })).to.eventually.be.rejectedWith(errorMessage)
    })

    it('throws an error if the base engine does not exist for symbol', () => {
      engines = new Map([['LTC', counterEngineStub]])
      return expect(
        releaseChannels({ params, relayer, logger, engines, orderbooks })
      ).to.eventually.be.rejectedWith(PublicError, `No engine available for BTC`)
    })

    it('throws an error if the counter engine does not exist for symbol', () => {
      engines = new Map([['BTC', baseEngineStub]])
      return expect(
        releaseChannels({ params, relayer, logger, engines, orderbooks })
      ).to.be.rejectedWith(PublicError, `No engine available for LTC`)
    })
  })
})
