const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getBalances = rewire(path.resolve(__dirname, 'get-balances'))

describe('get-balances', () => {
  describe('getBalances', () => {
    let logger
    let engineStub
    let engines
    let GetBalancesResponse
    let balancesStub
    let revert

    beforeEach(() => {
      logger = {
        info: sinon.stub()
      }
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

    beforeEach(() => {
      symbol = 'BTC'
      uncommittedBalance = 1000000
      totalChannelBalance = 10000
      uncommittedBalanceStub = sinon.stub().resolves(uncommittedBalance)
      totalChannelBalanceStub = sinon.stub().resolves(totalChannelBalance)
      engineStub = {
        getTotalBalance: uncommittedBalanceStub,
        getTotalChannelBalance: totalChannelBalanceStub
      }
      engine = [symbol, engineStub]

      getEngineBalances = getBalances.__get__('getEngineBalances')
    })

    beforeEach(async () => {
      res = await getEngineBalances(engine)
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
        uncommittedBalance,
        totalChannelBalance
      })
    })
  })
})
