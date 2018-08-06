const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getTradingCapacities = rewire(path.resolve(__dirname, 'get-trading-capacities'))

describe('getTradingCapacities', () => {
  let logger
  let baseEngineStub
  let counterEngineStub
  let engines
  let GetTradingCapacitiesResponse
  let getEngineTradingCapacitiesStub
  let revert
  let params

  beforeEach(() => {
    logger = {
      info: sinon.stub()
    }
    params = { market: 'BTC/LTC' }
    baseEngineStub = sinon.stub()
    counterEngineStub = sinon.stub()
    engines = new Map([['BTC', baseEngineStub], ['LTC', counterEngineStub]])
    getEngineTradingCapacitiesStub = sinon.stub().resolves({})
    GetTradingCapacitiesResponse = sinon.stub()

    revert = getTradingCapacities.__set__('getEngineTradingCapacities', getEngineTradingCapacitiesStub)
  })

  beforeEach(async () => {
    await getTradingCapacities({ params, logger, engines }, { GetTradingCapacitiesResponse })
  })

  afterEach(() => {
    revert()
  })

  it('gets the balances from a particular engine', () => {
    expect(getEngineTradingCapacitiesStub).to.have.been.calledTwice()
    expect(getEngineTradingCapacitiesStub).to.have.been.calledWith(['BTC', baseEngineStub])
    expect(getEngineTradingCapacitiesStub).to.have.been.calledWith(['LTC', counterEngineStub])
  })

  it('returns all channel balances for the broker daemon', () => {
    expect(GetTradingCapacitiesResponse).to.have.been.calledWith({baseSymbolCapacities: {}, counterSymbolCapacities: {}})
  })
})

describe('getEngineTradingCapacities', () => {
  let engineStub
  let symbol
  let engine
  let getEngineTradingCapacities
  let res
  let openChannelCapacities
  let pendingChannelCapacities

  beforeEach(() => {
    symbol = 'BTC'
    openChannelCapacities = { active: { localBalance: 100, remoteBalance: 1000 }, inactive: { localBalance: 200, remoteBalance: 2000 } }
    pendingChannelCapacities = { localBalance: 500, remoteBalance: 1000 }
    engineStub = {
      getOpenChannelCapacities: sinon.stub().resolves(openChannelCapacities),
      getPendingChannelCapacities: sinon.stub().resolves(pendingChannelCapacities)
    }
    engine = [symbol, engineStub]

    getEngineTradingCapacities = getTradingCapacities.__get__('getEngineTradingCapacities')
  })

  beforeEach(async () => {
    res = await getEngineTradingCapacities(engine)
  })

  it('gets the total balance of an engine', () => {
    expect(engineStub.getOpenChannelCapacities).to.have.been.calledOnce()
  })

  it('gets the total channel balance of an engine', () => {
    expect(engineStub.getPendingChannelCapacities).to.have.been.calledOnce()
  })

  it('returns balances for an engine', () => {
    expect(res).to.eql({
      symbol,
      activeReceiveCapacity: '0.00001',
      activeSendCapacity: '0.000001',
      inactiveReceiveCapacity: '0.00002',
      inactiveSendCapacity: '0.000002',
      pendingReceiveCapacity: '0.00001',
      pendingSendCapacity: '0.000005'
    })
  })
})
