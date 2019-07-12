const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const newDepositAddress = rewire(path.resolve(__dirname, 'new-deposit-address'))

describe('new-deposit-address', () => {
  let logger
  let params
  let engine
  let engines
  let newAddressStub
  let newAddressResponse

  before(() => {
    logger = {
      error: sinon.stub()
    }
    params = {
      symbol: 'BTC'
    }
    newAddressResponse = '12345'
    newAddressStub = sinon.stub().returns(newAddressResponse)
    engine = { createNewAddress: newAddressStub }
    engines = new Map([['BTC', engine]])
  })

  describe('newDepositAddress', () => {
    let res

    beforeEach(async () => {
      res = await newDepositAddress({ logger, engines, params })
    })

    it('calls an engine with createNewAddress', () => {
      expect(newAddressStub).to.have.been.called()
    })

    it('constructs a NewAddressResponse', () => {
      const address = newAddressResponse
      expect(res).to.be.eql({ address })
    })
  })

  describe('invalid engine type', () => {
    const badParams = { symbol: 'BAD' }

    it('throws an error', () => {
      return expect(newDepositAddress({ logger, engines, params: badParams })).to.eventually.be.rejectedWith('Unable to generate address')
    })
  })
})
