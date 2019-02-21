const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { PublicError } = require('grpc-methods')
const { Big } = require('../../utils')

const commit = rewire(path.resolve(__dirname, 'commit'))

describe('commit', () => {
  let EmptyResponse
  let params
  let relayer
  let logger
  let btcEngine
  let ltcEngine
  let paymentNetworkAddress
  let res
  let createChannelRelayerStub
  let convertBalanceStub
  let createChannelStub
  let getAddressStub
  let relayerAddress
  let engines
  let getMaxOutboundChannelStub
  let getMaxInboundChannelStub
  let orderbooks

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    paymentNetworkAddress = 'asdf12345@localhost'
    relayerAddress = 'qwerty@localhost'
    getAddressStub = sinon.stub().resolves({ address: paymentNetworkAddress })
    createChannelRelayerStub = sinon.stub().resolves({})
    convertBalanceStub = sinon.stub().returns('100000')
    createChannelStub = sinon.stub()
    orderbooks = new Map([['BTC/LTC', {}]])
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    }
    getMaxOutboundChannelStub = sinon.stub().resolves({})
    getMaxInboundChannelStub = sinon.stub().resolves({})

    btcEngine = {
      createChannel: createChannelStub,
      getMaxChannel: getMaxOutboundChannelStub,
      symbol: 'BTC',
      feeEstimate: '20000',
      quantumsPerCommon: '100000000',
      maxChannelBalance: '16777215'
    }
    ltcEngine = {
      getPaymentChannelNetworkAddress: sinon.stub().resolves(relayerAddress),
      getMaxChannel: getMaxInboundChannelStub,
      symbol: 'LTC',
      feeEstimate: '20000',
      quantumsPerCommon: '100000000',
      maxChannelBalance: '1006632900'
    }
    engines = new Map([
      ['BTC', btcEngine],
      ['LTC', ltcEngine]
    ])
    params = {
      balance: '0.10000000',
      symbol: 'BTC',
      market: 'BTC/LTC'
    }
    relayer = {
      identity: {
        authorize: sinon.stub()
      },
      paymentChannelNetworkService: {
        getAddress: getAddressStub,
        createChannel: createChannelRelayerStub
      }
    }

    commit.__set__('convertBalance', convertBalanceStub)
  })

  it('balance under minimum amount throws an error for an incorrect balance', () => {
    params.balance = '0.00000100'
    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(PublicError, 'Minimum balance of')
  })

  it('balance over allowed maximum value throws an error for an incorrect balance', () => {
    const maxBalance = btcEngine.maxChannelBalance
    params.balance = maxBalance + 1
    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(PublicError, 'Maximum balance')
  })

  it('throws an error if the inbound channel exceeds the maximum value', () => {
    ltcEngine.maxChannelBalance = btcEngine.maxChannelBalance

    params.balance = btcEngine.maxChannelBalance - 1
    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(PublicError, 'Maximum balance')
  })

  it('throws an error if creating a channel fails', () => {
    createChannelStub.rejects(new Error('channels cannot be created before the wallet is fully synced'))

    expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(PublicError, 'Funding error')
  })

  it('throws an error if requesting an inbound channel fails', () => {
    createChannelRelayerStub.rejects(new Error('fake relayer error'))

    expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(PublicError, 'Error requesting inbound channel')
  })

  describe('committing a balance to the relayer', () => {
    let fakeAuth
    beforeEach(async () => {
      fakeAuth = 'fake auth'
      relayer.identity.authorize.returns(fakeAuth)
      res = await commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    })

    it('receives a payment channel network address from the relayer', () => {
      expect(getAddressStub).to.have.been.calledWith({ symbol: params.symbol })
    })

    it('creates a channel through an btc engine with base units', () => {
      const baseUnitsBalance = Big(params.balance).times(btcEngine.quantumsPerCommon).toString()
      expect(btcEngine.createChannel).to.have.been.calledWith(paymentNetworkAddress, baseUnitsBalance)
    })

    it('retrieves the address from an inverse engine', () => {
      expect(ltcEngine.getPaymentChannelNetworkAddress).to.have.been.called()
    })

    it('converts the balance to the currency of the channel to open on the relayer', () => {
      expect(convertBalanceStub).to.have.been.calledWith('10000000', 'BTC', 'LTC')
    })

    it('authorizes a request to the relayer', () => {
      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('makes a request to the relayer to create a channel', () => {
      expect(createChannelRelayerStub).to.have.been.calledOnce()
      expect(createChannelRelayerStub).to.have.been.calledWith({
        address: relayerAddress,
        balance: '100000',
        symbol: 'LTC'
      }, fakeAuth)
    })

    it('constructs a EmptyResponse', () => {
      expect(EmptyResponse).to.have.been.calledWith({})
    })

    it('returns a EmptyResponse', () => {
      expect(res).to.be.eql(new EmptyResponse())
    })
  })

  describe('invalid market', () => {
    it('throws an error if engine does not exist for symbol', () => {
      const badParams = { symbol: 'BTC', market: 'BTC/BAD' }
      const errorMessage = `${badParams.market} is not being tracked as a market.`
      return expect(commit({ params: badParams, relayer, logger, engines, orderbooks }, { EmptyResponse })).to.eventually.be.rejectedWith(errorMessage)
    })
  })

  describe('invalid engine types', () => {
    it('throws an error if engine does not exist for symbol', () => {
      const badParams = { symbol: 'BAD', market: 'BTC/LTC' }
      const errorMessage = `No engine is configured for symbol: ${badParams.symbol}`
      return expect(commit({ params: badParams, relayer, logger, engines, orderbooks }, { EmptyResponse })).to.eventually.be.rejectedWith(errorMessage)
    })

    it('throws an error if inverse engine is not found', () => {
      const badEngines = new Map([['BTC', btcEngine]])
      return expect(
        commit({ params, relayer, logger, engines: badEngines, orderbooks }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, 'No engine is configured for symbol')
    })
  })

  describe('checking channel balances', () => {
    it('does not throw if there are already open inbound and outbound channel', () => {
      getMaxOutboundChannelStub.resolves({ maxBalance: '10000001' })
      getMaxInboundChannelStub.resolves({ maxBalance: '100000' })

      return expect(
        commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
      ).to.not.be.rejected()
    })

    it('opens an outbound channel if the outbound channel does not exist', async () => {
      getMaxOutboundChannelStub.resolves({})
      getMaxInboundChannelStub.resolves({ maxBalance: '100000' })

      await commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })

      expect(btcEngine.createChannel).to.have.been.calledOnce()
      expect(createChannelRelayerStub).to.not.have.been.called()
    })

    it('opens an inbound channel if the inbound channel does not exist', async () => {
      getMaxOutboundChannelStub.resolves({ maxBalance: '10000001' })
      getMaxInboundChannelStub.resolves({})

      await commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })

      expect(btcEngine.createChannel).to.not.have.been.called()
      expect(createChannelRelayerStub).to.have.been.calledOnce()
    })

    it('throws an error if the outbound channel does not have the desired amount excluding the fee estimate', () => {
      getMaxOutboundChannelStub.resolves({ maxBalance: '1000' })
      getMaxInboundChannelStub.resolves({ maxBalance: '100000' })
      return expect(
        commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, 'You have an existing outbound channel with a balance lower than desired, release that channel and try again.')
    })

    it('throws an error if the inbound channel does not have the desired amount excluding the fee estimate', () => {
      getMaxOutboundChannelStub.resolves({ maxBalance: '100000001' })
      getMaxInboundChannelStub.resolves({ maxBalance: '70000' })
      return expect(
        commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
      ).to.be.rejectedWith(PublicError, 'You have an existing inbound channel with a balance lower than desired, release that channel and try again.')
    })
  })
})
