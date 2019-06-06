const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')
const { Big } = require('../../utils')

const commit = rewire(path.resolve(__dirname, 'commit'))

describe('commit', () => {
  let EmptyResponse
  let params
  let relayer
  let logger
  let btcEngine
  let ltcEngine
  let res
  let createChannelRelayerStub
  let createChannelsStub
  let getAddressStub
  let relayerAddress
  let engines
  let getTotalBalanceForAddressStub
  let orderbooks
  let inboundPaymentNetworkAddress
  let outboundPaymentNetworkAddress
  let relayerInverseAddress

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    outboundPaymentNetworkAddress = 'asdf12345@localhost'
    inboundPaymentNetworkAddress = 'hgfd56775@localhost'
    relayerAddress = 'qwerty@localhost'
    relayerInverseAddress = 'lol@localhost'
    getAddressStub = sinon.stub()
    getAddressStub.withArgs({ symbol: 'BTC' }).resolves({ address: relayerAddress })
    getAddressStub.withArgs({ symbol: 'LTC' }).resolves({ address: relayerInverseAddress })
    createChannelRelayerStub = sinon.stub().resolves({})
    createChannelsStub = sinon.stub()
    orderbooks = new Map([['BTC/LTC', {}]])
    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    }
    getTotalBalanceForAddressStub = sinon.stub().resolves('0')
    btcEngine = {
      createChannels: createChannelsStub,
      getTotalBalanceForAddress: getTotalBalanceForAddressStub,
      symbol: 'BTC',
      feeEstimate: '20000',
      quantumsPerCommon: '100000000',
      maxChannelBalance: '16777215',
      getPaymentChannelNetworkAddress: sinon.stub().resolves(outboundPaymentNetworkAddress)
    }
    ltcEngine = {
      getPaymentChannelNetworkAddress: sinon.stub().resolves(inboundPaymentNetworkAddress),
      symbol: 'LTC',
      feeEstimate: '20000',
      quantumsPerCommon: '100000000',
      maxChannelBalance: '1006632900',
      connectUser: sinon.stub()
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
  })

  it('throws an error if creating a channel fails', () => {
    createChannelsStub.rejects(new Error('channels cannot be created before the wallet is fully synced'))

    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(Error, 'Funding error')
  })

  it('does not throw if we encounter a channel too small error and we already have balance', () => {
    createChannelsStub.rejects(new Error('Funding amount 0.1 BTC too small for minimum channel balance of 0.00002 BTC.'))
    getTotalBalanceForAddressStub.resolves('100000')

    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.not.be.rejected()
  })

  it('throws if we encounter a channel too small error and we do not have balance', () => {
    createChannelsStub.rejects(new Error('Funding amount 0.1 BTC too small for minimum channel balance of 0.00002 BTC.'))

    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith('Funding error: Funding amount 0.1 BTC too small for minimum channel balance of 0.00002 BTC')
  })

  it('throws an error if requesting an inbound channel fails', () => {
    createChannelRelayerStub.rejects(new Error('fake relayer error'))

    return expect(
      commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
    ).to.be.rejectedWith(Error, 'Error requesting inbound channel')
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
      expect(btcEngine.createChannels).to.have.been.calledWith(relayerAddress, baseUnitsBalance)
    })

    it('retrieves the address from the outbound engine', () => {
      expect(ltcEngine.getPaymentChannelNetworkAddress).to.have.been.called()
    })

    it('retrieves the address from an inbound engine', () => {
      expect(ltcEngine.getPaymentChannelNetworkAddress).to.have.been.called()
    })

    it('authorizes a request to the relayer', () => {
      expect(relayer.identity.authorize).to.have.been.calledOnce()
    })

    it('connects to the relayer through its inverse engine', () => {
      expect(ltcEngine.connectUser).to.have.been.calledWith(relayerInverseAddress)
    })

    it('makes a request to the relayer to create a channel', () => {
      const baseUnitsBalance = Big(params.balance).times(btcEngine.quantumsPerCommon).toString()

      expect(createChannelRelayerStub).to.have.been.calledOnce()
      expect(createChannelRelayerStub).to.have.been.calledWith({
        outbound: {
          balance: baseUnitsBalance,
          symbol: 'BTC',
          address: outboundPaymentNetworkAddress
        },
        inbound: {
          symbol: 'LTC',
          address: inboundPaymentNetworkAddress
        }
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
    it('throws an error if market is not being tracked', () => {
      const badParams = { symbol: 'BTC', market: 'BTC/BAD' }
      const errorMessage = `${badParams.market} is not being tracked as a market.`
      return expect(commit({ params: badParams, relayer, logger, engines, orderbooks }, { EmptyResponse })).to.eventually.be.rejectedWith(errorMessage)
    })
  })

  describe('invalid engine types', () => {
    it('throws an error if engine does not exist for symbol', () => {
      const badParams = { symbol: 'BAD', market: 'BTC/LTC' }
      const errorMessage = `No engine is configured for symbol: ${badParams.symbol}`
      getAddressStub.withArgs({ symbol: 'BAD' }).resolves({ address: relayerAddress })
      return expect(commit({ params: badParams, relayer, logger, engines, orderbooks }, { EmptyResponse })).to.eventually.be.rejectedWith(errorMessage)
    })

    it('throws an error if inverse engine is not found', () => {
      const badEngines = new Map([['BTC', btcEngine]])
      return expect(
        commit({ params, relayer, logger, engines: badEngines, orderbooks }, { EmptyResponse })
      ).to.be.rejectedWith(Error, 'No engine is configured for symbol')
    })
  })

  describe('checking channel balances', () => {
    it('does not throw if there are already open inbound and outbound channel', () => {
      getTotalBalanceForAddressStub.resolves('10000001')

      return expect(
        commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })
      ).to.not.be.rejected()
    })

    it('opens outbound channels if no outbound channels exist', async () => {
      getTotalBalanceForAddressStub.resolves('0')

      await commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })

      expect(btcEngine.createChannels).to.have.been.calledOnce()
      expect(btcEngine.createChannels).to.have.been.calledWith(relayerAddress, '10000000')
    })

    it('opens outbound channels if the existing channels are not large enough', async () => {
      getTotalBalanceForAddressStub.resolves('5000000')

      await commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse })

      expect(btcEngine.createChannels).to.have.been.calledOnce()
      expect(btcEngine.createChannels).to.have.been.calledWith(relayerAddress, '5000000')
    })
  })
})
