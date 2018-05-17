const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const newDepositAddress = rewire(path.resolve(__dirname, 'new-deposit-address'))

describe('newDepositAddress', () => {
  let logger
  let engine
  let newAddressStub
  let newAddressResponse
  let responseStub

  before(() => {
    logger = sinon.stub()
    newAddressResponse = '12345'
    newAddressStub = sinon.stub().returns(newAddressResponse)
    responseStub = sinon.stub()
    engine = { newAddress: newAddressStub }

    newDepositAddress({ logger, engine }, { NewDepositAddressResponse: responseStub })
  })

  it('calls an engine with newDepositAddress', () => {
    expect(newAddressStub).to.have.been.called()
  })

  it('constructs a NewAddressResponse', () => {
    const address = newAddressResponse
    expect(responseStub).to.have.been.calledWith({ address })
  })
})
