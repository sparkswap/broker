const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getSupportedMarkets = rewire(path.resolve(__dirname, 'get-supported-markets'))

describe('getSupportedMarkets', () => {
  let logger
  let engineStub
  let engines
  let relayer
  let markets
  let orderbooks

  beforeEach(() => {
    logger = {
      info: sinon.stub()
    }
    engineStub = sinon.stub()
    engines = [ engineStub ]
    orderbooks = new Map([['BTC/LTC', {}], ['ABC/XYZ', {}]])
    markets = ['BTC/LTC']
    relayer = {
      adminService: {
        getMarkets: sinon.stub().resolves({ markets })
      }
    }
  })

  it('throws an error if the relayer is unresponsive', () => {
    relayer.adminService.getMarkets.rejects()
    return expect(getSupportedMarkets({ logger, engines, relayer, orderbooks })).to.eventually.be.rejectedWith('Failed to get markets')
  })

  it('gets the balances from a particular engine', async () => {
    await getSupportedMarkets({ logger, engines, relayer, orderbooks })
    expect(relayer.adminService.getMarkets).to.have.been.calledOnce()
  })

  it('adds market information for supported markets from the relayer', async () => {
    orderbooks = new Map([['BTC/LTC', {}]])
    const res = await getSupportedMarkets({ logger, engines, relayer, orderbooks })
    expect(res).to.be.eql({
      supportedMarkets: [{
        active: true,
        base: 'BTC',
        counter: 'LTC',
        id: 'BTC/LTC',
        symbol: 'BTC/LTC'
      }]
    })
  })

  it('does not add market information if the market did not come from the relayer', async () => {
    orderbooks = new Map([['ABC/XYZ', {}]])
    const res = await getSupportedMarkets({ logger, engines, relayer, orderbooks })
    expect(res).to.be.eql({
      supportedMarkets: []
    })
  })

  it('adds market information for supported markets from the relayer but not for others', async () => {
    orderbooks = new Map([['BTC/LTC', {}], ['ABC/XYZ', {}]])
    const res = await getSupportedMarkets({ logger, engines, relayer, orderbooks })
    expect(res).to.be.eql({
      supportedMarkets: [{
        active: true,
        base: 'BTC',
        counter: 'LTC',
        id: 'BTC/LTC',
        symbol: 'BTC/LTC'
      }]
    })
  })
})
