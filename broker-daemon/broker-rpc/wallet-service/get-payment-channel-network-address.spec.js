const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getPaymentChannelNetworkAddress = rewire(path.resolve(__dirname, 'get-payment-channel-network-address'))

describe('get-payment-channel-network-address', () => {
  let logger
  let params
  let engine
  let engines
  let getNetworkAddressStub
  let getNetworkAddressResponse

  before(() => {
    logger = {
      error: sinon.stub()
    }
    params = {
      symbol: 'BTC'
    }
    getNetworkAddressResponse = '12345'
    getNetworkAddressStub = sinon.stub().returns(getNetworkAddressResponse)
    engine = { getPaymentChannelNetworkAddress: getNetworkAddressStub }
    engines = new Map([['BTC', engine]])
  })

  describe('getPaymentChannelNetworkAddress', () => {
    let res

    beforeEach(async () => {
      res = await getPaymentChannelNetworkAddress({ logger, engines, params })
    })

    it('calls an engine with getPaymentChannelNetworkAddress', () => {
      expect(getNetworkAddressStub).to.have.been.called()
    })

    it('constructs a Response', () => {
      const paymentChannelNetworkAddress = getNetworkAddressResponse
      expect(res).to.be.eql({ paymentChannelNetworkAddress })
    })
  })

  describe('invalid engine type', () => {
    const badParams = { symbol: 'BAD' }

    it('throws an error', () => {
      return expect(getPaymentChannelNetworkAddress({ logger, engines, params: badParams })).to.eventually.be.rejectedWith('Unable to get network address')
    })
  })
})
