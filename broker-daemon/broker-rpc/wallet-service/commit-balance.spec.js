const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')

const commitBalance = rewire(path.resolve(__dirname, 'commit-balance'))

describe('commit-balance', () => {
  let EmptyResponse
  let params
  let relayer
  let logger
  let engine
  let addressStub
  let address
  let res

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    address = 'asdf12345@localhost'
    addressStub = sinon.stub().returns({ address })
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    engine = {
      createChannel: sinon.stub()
    }
    params = {
      balance: 10000000,
      symbol: 'BTC'
    }
    relayer = { paymentChannelNetworkService: { getAddress: addressStub } }
  })

  describe('committing a balance to the exchange', () => {
    beforeEach(async () => {
      res = await commitBalance({ params, relayer, logger, engine }, { EmptyResponse })
    })

    it('receives a public key from the relayer', () => {
      expect(addressStub).to.have.been.calledWith({symbol: params.symbol})
    })

    it('creates a channel through an engine', () => {
      expect(engine.createChannel).to.have.been.calledWith(address, params.balance, params.symbol)
    })

    it('constructs a EmptyResponse', () => {
      expect(EmptyResponse).to.have.been.calledWith({})
    })

    it('returns a EmptyResponse', () => {
      expect(res).to.be.eql(new EmptyResponse())
    })
  })

  describe('balance under minimum amount', () => {
    it('throws an error for an incorrect balance', () => {
      params.balance = 100
      return expect(
        commitBalance({ params, relayer, logger, engine }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError)
    })
  })

  describe('balance over allowed maximum value', () => {
    let maxBalance = commitBalance.__get__('MAX_CHANNEL_BALANCE')

    it('throws an error for an incorrect balance', () => {
      params.balance = maxBalance + 1
      return expect(
        commitBalance({ params, relayer, logger, engine }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError)
    })
  })
})
