const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getBalances = rewire(path.resolve(__dirname, 'get-balances'))

describe('get-balances', () => {
  let logger

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub()
    }
  })

  describe('getBalances', () => {
    let engineStub
    let engines
    let GetBalancesResponse
    let balancesStub
    let revert

    beforeEach(() => {
      engineStub = sinon.stub()
      engines = [ engineStub ]
      balancesStub = sinon.stub().resolves(engineStub)
      GetBalancesResponse = sinon.stub()

      revert = getBalances.__set__('getEngineBalances', balancesStub)
    })

    beforeEach(async () => {
      await getBalances({ logger, engines }, { GetBalancesResponse })
    })

    afterEach(() => {
      revert()
    })

    it('gets the balances from a particular engine', () => {
      expect(balancesStub).to.have.been.calledOnce()
      expect(balancesStub).to.have.been.calledWith(engineStub)
    })

    it('returns all channel balances for the broker daemon', () => {
      expect(GetBalancesResponse).to.have.been.calledWith({ balances: [engineStub] })
    })
  })

  describe('getEngineBalances', () => {
    let uncommittedBalance
    let uncommittedBalanceStub
    let totalChannelBalance
    let totalChannelBalanceStub
    let engineStub
    let symbol
    let engine
    let getEngineBalances
    let res
    let totalPendingChannelBalance
    let uncommittedPendingBalance
    let uncommittedPendingBalanceStub
    let totalPendingBalanceStub
    let currencyConfig

    beforeEach(() => {
      symbol = 'BTC'
      uncommittedBalance = 1000000
      totalChannelBalance = 10000
      totalPendingChannelBalance = 1000
      uncommittedPendingBalance = 5000
      currencyConfig = [{
        name: 'Bitcoin',
        symbol: 'BTC',
        quantumsPerCommon: '100000000',
        maxChannelBalance: '16777215'
      }]

      uncommittedBalanceStub = sinon.stub().resolves(uncommittedBalance)
      totalChannelBalanceStub = sinon.stub().resolves(totalChannelBalance)
      totalPendingBalanceStub = sinon.stub().resolves(totalPendingChannelBalance)
      uncommittedPendingBalanceStub = sinon.stub().resolves(uncommittedPendingBalance)
      engineStub = {
        getUncommittedBalance: uncommittedBalanceStub,
        getTotalChannelBalance: totalChannelBalanceStub,
        getTotalPendingChannelBalance: totalPendingBalanceStub,
        getUncommittedPendingBalance: uncommittedPendingBalanceStub
      }
      engine = [symbol, engineStub]

      getEngineBalances = getBalances.__get__('getEngineBalances')
      getBalances.__set__('currencyConfig', currencyConfig)
    })

    beforeEach(async () => {
      res = await getEngineBalances(engine, logger)
    })

    it('gets the total balance of an engine', () => {
      expect(uncommittedBalanceStub).to.have.been.calledOnce()
    })

    it('gets the total channel balance of an engine', () => {
      expect(totalChannelBalanceStub).to.have.been.calledOnce()
    })

    it('returns balances for an engine', () => {
      expect(res).to.eql({
        symbol,
        uncommittedBalance: '0.0100000000000000',
        totalChannelBalance: '0.0001000000000000',
        totalPendingChannelBalance: '0.0000100000000000',
        uncommittedPendingBalance: '0.0000500000000000'
      })
    })

    it('returns an error if a currencies config is not found', () => {
      engine = ['LTC', engineStub]
      return expect(getEngineBalances(engine, logger)).to.eventually.be.rejectedWith('Currency not supported')
    })
  })
})
