const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const withdrawFunds = rewire(path.resolve(__dirname, 'withdraw-funds'))

describe('withdrawFunds', () => {
  let EmptyResponse
  let params
  let relayer
  let logger
  let btcEngine
  let res
  let engines
  let withdrawFundsStub

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    withdrawFundsStub = sinon.stub().resolves({txid: 'asdf'})
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
  })

  describe('withdrawFunds a balance to the exchange', () => {
    beforeEach(async () => {
      res = await withdrawFunds({ params, relayer, logger, engines }, { EmptyResponse })
    })

    it('makes a request to the engine to withdrawFunds to the address specified', () => {
      expect(btcEngine.withdrawFunds).to.have.been.calledWith(
        params.address,
        parseInt(params.amount) * 100000000
      )
    })

    it('returns an empty object', () => {
      expect(res).to.be.eql({})
    })
  })

  describe('invalid engine types', () => {
    it('throws an error if engine is not found', () => {
      const badEngines = new Map([['BTC', undefined]])
      return expect(
        withdrawFunds({ params, relayer, logger, engines: badEngines }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, `No engine available for ${params.symbol}`)
    })
  })

  describe('balance under minimum amount', () => {
    it('throws an error for an incorrect balance', () => {
      withdrawFundsStub.throws('Error', 'Insufficient Funds')

      return expect(
        withdrawFunds({ params, relayer, logger, engines }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, 'Insufficient Funds')
    })
  })
})
