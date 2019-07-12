const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { Big } = require('../../utils')
const withdrawFunds = rewire(path.resolve(__dirname, 'withdraw-funds'))

describe('withdrawFunds', () => {
  let params
  let relayer
  let logger
  let btcEngine
  let engines
  let withdrawFundsStub
  let txid

  beforeEach(() => {
    txid = 'asdf'
    withdrawFundsStub = sinon.stub().resolves(txid)
    logger = {
      info: sinon.stub()
    }
    btcEngine = {
      withdrawFunds: withdrawFundsStub,
      quantumsPerCommon: '100000000'
    }

    engines = new Map([
      ['BTC', btcEngine]
    ])
    params = {
      amount: '10000000',
      symbol: 'BTC',
      address: 'asdf'
    }
  })

  describe('withdrawFunds', () => {
    let res
    beforeEach(async () => {
      res = await withdrawFunds({ params, relayer, logger, engines })
    })

    it('makes a request to the engine to withdrawFunds to the address specified', () => {
      expect(btcEngine.withdrawFunds).to.have.been.calledWith(
        params.address,
        Big(params.amount).times(100000000).toString()
      )
    })

    it('returns an WithdrawFundsResponse', () => {
      expect(res).to.be.eql({ txid })
    })
  })

  describe('invalid engine types', () => {
    it('throws an error if engine is not found', () => {
      const badEngines = new Map([['BTC', undefined]])
      return expect(
        withdrawFunds({ params, relayer, logger, engines: badEngines })
      ).to.be.rejectedWith(Error, `No engine available for ${params.symbol}`)
    })
  })

  describe('balance under minimum amount', () => {
    it('throws an Error on withdraw failure', () => {
      withdrawFundsStub.throws('Error', 'Insufficient Funds')

      return expect(
        withdrawFunds({ params, relayer, logger, engines })
      ).to.be.rejectedWith(Error, 'Insufficient Funds')
    })
  })

  describe('invalid currency multiplier', () => {
    beforeEach(() => {
      btcEngine.quantumsPerCommon = null
    })
    it('throws an error currency multiplier does not exist', () => {
      return expect(
        withdrawFunds({ params, relayer, logger, engines })
      ).to.be.rejectedWith(Error, `Invalid configuration: missing quantumsPerCommon for ${params.symbol}`)
    })
  })
})
