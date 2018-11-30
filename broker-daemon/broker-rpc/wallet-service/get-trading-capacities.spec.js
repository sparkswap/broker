const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getTradingCapacities = rewire(path.resolve(__dirname, 'get-trading-capacities'))

describe('getTradingCapacities', () => {
  let logger
  let baseEngineStub
  let counterEngineStub
  let engines
  let GetTradingCapacitiesResponse
  let getCapacitiesStub
  let revert
  let params
  let orderbooks
  let blockOrderWorker
  let committedBaseSendCapacity
  let committedBaseReceiveCapacity
  let committedCounterSendCapacity
  let committedCounterReceiveCapacity

  beforeEach(() => {
    logger = {
      info: sinon.stub()
    }
    params = { market: 'BTC/LTC' }
    orderbooks = new Map([['BTC/LTC', { store: sinon.stub() }]])
    baseEngineStub = sinon.stub()
    counterEngineStub = sinon.stub()
    engines = new Map([['BTC', baseEngineStub], ['LTC', counterEngineStub]])
    getCapacitiesStub = sinon.stub().resolves({})
    GetTradingCapacitiesResponse = sinon.stub()
    blockOrderWorker = {
      calculateActiveFunds: sinon.stub()
    }
    committedBaseSendCapacity = '0.00001'
    committedBaseReceiveCapacity = '0.00002'
    committedCounterSendCapacity = '0.00003'
    committedCounterReceiveCapacity = '0.00004'
    blockOrderWorker.calculateActiveFunds.withArgs(params.market, 'BID').resolves({activeInboundAmount: committedBaseReceiveCapacity, activeOutboundAmount: committedCounterSendCapacity})
    blockOrderWorker.calculateActiveFunds.withArgs(params.market, 'ASK').resolves({activeInboundAmount: committedCounterReceiveCapacity, activeOutboundAmount: committedBaseSendCapacity})

    revert = getTradingCapacities.__set__('getCapacities', getCapacitiesStub)
  })

  afterEach(() => {
    revert()
  })

  it('throws an error if the market does not exist in the orderbook', () => {
    orderbooks = new Map([['ABC/DXS', { store: sinon.stub() }]])

    const errorMessage = `${params.market} is not being tracked as a market.`
    return expect(getTradingCapacities({ params, logger, engines, orderbooks, blockOrderWorker }, GetTradingCapacitiesResponse)).to.eventually.be.rejectedWith(errorMessage)
  })

  it('throws an error if the base engine does not exist for symbol', () => {
    engines = new Map([['LTC', counterEngineStub]])
    return expect(
      getTradingCapacities({ params, logger, engines, orderbooks, blockOrderWorker }, GetTradingCapacitiesResponse)
    ).to.eventually.be.rejectedWith(`No engine available for BTC`)
  })

  it('throws an error if the counter engine does not exist for symbol', () => {
    engines = new Map([['BTC', baseEngineStub]])
    return expect(
      getTradingCapacities({ params, logger, engines, orderbooks, blockOrderWorker }, GetTradingCapacitiesResponse)
    ).to.be.rejectedWith(`No engine available for LTC`)
  })

  it('gets the outstanding funds', async () => {
    await getTradingCapacities({ params, logger, engines, orderbooks, blockOrderWorker }, { GetTradingCapacitiesResponse })

    expect(blockOrderWorker.calculateActiveFunds).to.have.been.calledTwice()
    expect(blockOrderWorker.calculateActiveFunds).to.have.been.calledWith(params.market, 'BID')
    expect(blockOrderWorker.calculateActiveFunds).to.have.been.calledWith(params.market, 'ASK')
  })

  it('gets the balances from a particular engine', async () => {
    await getTradingCapacities({ params, logger, engines, orderbooks, blockOrderWorker }, { GetTradingCapacitiesResponse })

    expect(getCapacitiesStub).to.have.been.calledTwice()
    expect(getCapacitiesStub).to.have.been.calledWith(baseEngineStub, 'BTC', committedBaseSendCapacity, committedBaseReceiveCapacity)
    expect(getCapacitiesStub).to.have.been.calledWith(counterEngineStub, 'LTC', committedCounterSendCapacity, committedCounterReceiveCapacity)
  })

  it('returns all channel balances for the broker daemon', async () => {
    const result = await getTradingCapacities({ params, logger, engines, orderbooks, blockOrderWorker }, { GetTradingCapacitiesResponse })

    expect(result).to.be.an.instanceOf(GetTradingCapacitiesResponse)
    expect(GetTradingCapacitiesResponse).to.have.been.calledOnce()
    expect(GetTradingCapacitiesResponse).to.have.been.calledWithNew()
    expect(GetTradingCapacitiesResponse).to.have.been.calledWith({baseSymbolCapacities: {}, counterSymbolCapacities: {}})
  })
})

describe('getCapacities', () => {
  let engineStub
  let symbol
  let getCapacities
  let res
  let openChannelCapacities
  let pendingChannelCapacities

  beforeEach(() => {
    symbol = 'BTC'
    openChannelCapacities = { active: { localBalance: 500, remoteBalance: 1000 }, inactive: { localBalance: 200, remoteBalance: 2000 } }
    pendingChannelCapacities = { localBalance: 500, remoteBalance: 1000 }
    engineStub = {
      getOpenChannelCapacities: sinon.stub().resolves(openChannelCapacities),
      getPendingChannelCapacities: sinon.stub().resolves(pendingChannelCapacities)
    }
    getCapacities = getTradingCapacities.__get__('getCapacities')
  })

  beforeEach(async () => {
    res = await getCapacities(engineStub, 'BTC', '100', '200')
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
      availableReceiveCapacity: '0.000008',
      availableSendCapacity: '0.000004',
      inactiveReceiveCapacity: '0.00002',
      inactiveSendCapacity: '0.000002',
      pendingReceiveCapacity: '0.00001',
      pendingSendCapacity: '0.000005',
      outstandingReceiveCapacity: '0.000002',
      outstandingSendCapacity: '0.000001'
    })
  })
})
