const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const { Big } = require('../../utils')
const withdrawFunds = rewire(path.resolve(__dirname, 'withdraw-funds'))

describe('withdrawFunds', () => {
  let WithdrawFundsResponse
  let params
  let relayer
  let logger
  let btcEngine
  let engines
  let withdrawFundsStub
  let txid
  let currencies
  let revert

  beforeEach(() => {
    txid = 'asdf'
    WithdrawFundsResponse = sinon.stub()
    withdrawFundsStub = sinon.stub().resolves(txid)
    logger = {
      info: sinon.stub()
    }
    btcEngine = { withdrawFunds: withdrawFundsStub }

    engines = new Map([
      ['BTC', btcEngine]
    ])
    params = {
      amount: '10000000',
      symbol: 'BTC',
      address: 'asdf'
    }

    currencies = [
      {
        'name': 'Bitcoin',
        'symbol': 'BTC',
        'quantumsPerCommon': '100000000'
      },
      {
        'name': 'Litecoin',
        'symbol': 'LTC',
        'quantumsPerCommon': '100000000'
      }
    ]
    revert = withdrawFunds.__set__('currencies', currencies)
  })

  afterEach(() => {
    revert()
  })

  describe('withdrawFunds', () => {
    beforeEach(async () => {
      await withdrawFunds({ params, relayer, logger, engines }, { WithdrawFundsResponse })
    })

    it('makes a request to the engine to withdrawFunds to the address specified', () => {
      expect(btcEngine.withdrawFunds).to.have.been.calledWith(
        params.address,
        Big(params.amount).times(100000000)
      )
    })

    it('returns an WithdrawFundsResponse', () => {
      expect(WithdrawFundsResponse).to.have.been.calledWith({txid})
    })
  })

  describe('invalid engine types', () => {
    it('throws an error if engine is not found', () => {
      const badEngines = new Map([['BTC', undefined]])
      return expect(
        withdrawFunds({ params, relayer, logger, engines: badEngines }, { WithdrawFundsResponse })
      ).to.be.rejectedWith(PublicError, `No engine available for ${params.symbol}`)
    })
  })

  describe('balance under minimum amount', () => {
    it('throws a PublicError on withdraw failure', () => {
      withdrawFundsStub.throws('Error', 'Insufficient Funds')

      return expect(
        withdrawFunds({ params, relayer, logger, engines }, { WithdrawFundsResponse })
      ).to.be.rejectedWith(PublicError, 'Insufficient Funds')
    })
  })

  describe('invalid currency multiplier', () => {
    beforeEach(() => {
      revert = withdrawFunds.__set__('currencies', [])
    })
    it('throws an error currency multiplier does not exist', () => {
      return expect(
        withdrawFunds({ params, relayer, logger, engines }, { WithdrawFundsResponse })
      ).to.be.rejectedWith(PublicError, `No multiplier available for ${params.symbol}`)
    })
  })
})
