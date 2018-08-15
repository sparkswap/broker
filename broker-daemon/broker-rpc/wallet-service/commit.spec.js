const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const commit = rewire(path.resolve(__dirname, 'commit'))

describe('commit', () => {
  let EmptyResponse
  let params
  let relayer
  let logger
  let btcEngine
  let ltcEngine
  let address
  let res
  let createChannelRelayerStub
  let convertBalanceStub
  let createChannelStub
  let getAddressStub
  let relayerAddress
  let engines

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    address = 'asdf12345@localhost'
    relayerAddress = 'qwerty@localhost'
    getAddressStub = sinon.stub().resolves({ address })
    createChannelRelayerStub = sinon.stub().resolves({})
    convertBalanceStub = sinon.stub().returns('100')
    createChannelStub = sinon.stub()
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    btcEngine = {
      createChannel: createChannelStub
    }
    ltcEngine = {
      getPaymentChannelNetworkAddress: sinon.stub().resolves(relayerAddress)
    }
    engines = new Map([
      ['BTC', btcEngine],
      ['LTC', ltcEngine]
    ])
    params = {
      balance: '10000000',
      symbol: 'BTC'
    }
    relayer = {
      paymentChannelNetworkService: {
        getAddress: getAddressStub,
        createChannel: createChannelRelayerStub
      }
    }
    commit.__set__('convertBalance', convertBalanceStub)
  })

  describe('committing a balance to the exchange', () => {
    beforeEach(async () => {
      res = await commit({ params, relayer, logger, engines }, { EmptyResponse })
    })

    it('receives a payment channel network address from the relayer', () => {
      expect(getAddressStub).to.have.been.calledWith({symbol: params.symbol})
    })

    it('creates a channel through an btc engine', () => {
      expect(btcEngine.createChannel).to.have.been.calledWith(address, params.balance)
    })

    it('retrieves the address from an inverse engine', () => {
      expect(ltcEngine.getPaymentChannelNetworkAddress).to.have.been.called()
    })

    it('converts the balance to the currency of the channel to open on the relayer', () => {
      expect(convertBalanceStub).to.have.been.calledWith('10000000', 'BTC', 'LTC')
    })

    it('makes a request to the relayer to create a channel', () => {
      expect(relayer.paymentChannelNetworkService.createChannel).to.have.been.calledWith(sinon.match({
        address: relayerAddress,
        balance: '100',
        symbol: 'LTC'
      }))
    })

    it('constructs a EmptyResponse', () => {
      expect(EmptyResponse).to.have.been.calledWith({})
    })

    it('returns a EmptyResponse', () => {
      expect(res).to.be.eql(new EmptyResponse())
    })
  })

  describe('invalid engine types', () => {
    it('throws an error if engine does not exist for symbol', () => {
      const badParams = {symbol: 'BAD'}
      const errorMessage = `No engine is configured for symbol: ${badParams.symbol}`
      return expect(commit({ params: badParams, relayer, logger, engines }, { EmptyResponse })).to.eventually.be.rejectedWith(errorMessage)
    })

    it('throws an error if inverse engine is not found', () => {
      const badEngines = new Map([['BTC', btcEngine]])
      return expect(
        commit({ params, relayer, logger, engines: badEngines }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, 'No engine is configured for symbol')
    })
  })

  describe('balance under minimum amount', () => {
    it('throws an error for an incorrect balance', () => {
      params.balance = '100'
      return expect(
        commit({ params, relayer, logger, engines }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, 'Minimum balance of')
    })
  })

  describe('balance over allowed maximum value', () => {
    let maxBalance = commit.__get__('MAX_CHANNEL_BALANCE')

    it('throws an error for an incorrect balance', () => {
      params.balance = maxBalance + 1
      return expect(
        commit({ params, relayer, logger, engines }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError)
    })
  })
})
