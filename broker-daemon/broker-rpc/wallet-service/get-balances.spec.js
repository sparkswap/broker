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
    let balance
    let revert

    beforeEach(() => {
      balance = {
        uncommittedBalance: '0.0000000000000001',
        totalChannelBalance: '0.0000000000000001',
        totalPendingChannelBalance: '0.0000000000000001',
        uncommittedPendingBalance: '0.0000000000000001',
        totalReservedChannelBalance: '0.0000000000000001'
      }
      engineStub = sinon.stub()
      engines = new Map([['BTC', engineStub]])
      balancesStub = sinon.stub().resolves(balance)
      GetBalancesResponse = sinon.stub()

      revert = getBalances.__set__('getEngineBalances', balancesStub)
    })

    beforeEach(async () => {
    })

    afterEach(() => {
      revert()
    })

    it('gets the balances from a particular engine', async () => {
      await getBalances({ logger, engines }, { GetBalancesResponse })
      // The next line gets the first engine value
      const [symbol, engine] = engines.entries().next().value
      expect(balancesStub).to.have.been.calledOnce()
      expect(balancesStub).to.have.been.calledWith(symbol, engine, logger)
    })

    it('returns all balances for the broker daemon', async () => {
      await getBalances({ logger, engines }, { GetBalancesResponse })
      const expectedBalances = [
        sinon.match({
          symbol: 'BTC',
          ...balance
        })
      ]
      expect(GetBalancesResponse).to.have.been.calledWith({ balances: expectedBalances })
    })

    it('returns a blank payload if an engine is unavailable', async () => {
      const error = 'Engine not available'
      balancesStub.rejects(error)
      await getBalances({ logger, engines }, { GetBalancesResponse })
      const expectedBalances = [
        sinon.match({
          symbol: 'BTC',
          error
        })
      ]
      expect(GetBalancesResponse).to.have.been.calledWith({ balances: expectedBalances })
    })
  })

  describe('getEngineBalances', () => {
    let uncommittedBalance
    let uncommittedBalanceStub
    let totalChannelBalance
    let totalChannelBalanceStub
    let engineStub
    let symbol
    let getEngineBalances
    let totalPendingChannelBalance
    let uncommittedPendingBalance
    let uncommittedPendingBalanceStub
    let totalPendingBalanceStub
    let totalReservedChannelBalance
    let totalReservedChannelBalanceStub

    beforeEach(() => {
      symbol = 'BTC'
      uncommittedBalance = 1000000
      totalChannelBalance = 10000
      totalPendingChannelBalance = 1000
      uncommittedPendingBalance = 5000
      totalReservedChannelBalance = 1000

      uncommittedBalanceStub = sinon.stub().resolves(uncommittedBalance)
      totalChannelBalanceStub = sinon.stub().resolves(totalChannelBalance)
      totalPendingBalanceStub = sinon.stub().resolves(totalPendingChannelBalance)
      uncommittedPendingBalanceStub = sinon.stub().resolves(uncommittedPendingBalance)
      totalReservedChannelBalanceStub = sinon.stub().resolves(totalReservedChannelBalance)
      engineStub = {
        getUncommittedBalance: uncommittedBalanceStub,
        getTotalChannelBalance: totalChannelBalanceStub,
        getTotalPendingChannelBalance: totalPendingBalanceStub,
        getUncommittedPendingBalance: uncommittedPendingBalanceStub,
        getTotalReservedChannelBalance: totalReservedChannelBalanceStub,
        quantumsPerCommon: '100000000'
      }

      getEngineBalances = getBalances.__get__('getEngineBalances')
    })

    it('gets the total balance of an engine', async () => {
      await getEngineBalances(symbol, engineStub, logger)
      expect(uncommittedBalanceStub).to.have.been.calledOnce()
    })

    it('gets the total channel balance of an engine', async () => {
      await getEngineBalances(symbol, engineStub, logger)
      expect(totalChannelBalanceStub).to.have.been.calledOnce()
    })

    it('gets the total pending channel balance of an engine', async () => {
      await getEngineBalances(symbol, engineStub, logger)
      expect(totalPendingBalanceStub).to.have.been.calledOnce()
    })

    it('gets the total uncommitted pending balance of an engine', async () => {
      await getEngineBalances(symbol, engineStub, logger)
      expect(uncommittedPendingBalanceStub).to.have.been.calledOnce()
    })

    it('gets the total reserved channel balance of an engine', async () => {
      await getEngineBalances(symbol, engineStub, logger)
      expect(totalReservedChannelBalanceStub).to.have.been.calledOnce()
    })

    it('returns balances for an engine', async () => {
      const res = await getEngineBalances(symbol, engineStub, logger)
      expect(res).to.eql({
        uncommittedBalance: '0.0100000000000000',
        totalChannelBalance: '0.0001000000000000',
        totalPendingChannelBalance: '0.0000100000000000',
        uncommittedPendingBalance: '0.0000500000000000',
        totalReservedChannelBalance: '0.0000100000000000'
      })
    })
  })
})
