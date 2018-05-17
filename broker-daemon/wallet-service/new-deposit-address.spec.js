const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const newDepositAddress = rewire(path.resolve(__dirname, 'new-deposit-address'))

describe('newWalletAddress', () => {
  let logger
  let engine
  let newAddressStub
  let resSpy
  let newAddressResponse

  before(() => {
    logger = sinon.stub()
    resSpy = sinon.spy()
    newAddressResponse = '12345'
    newAddressStub = sinon.stub().returns(newAddressResponse)
    engine = { newDepositAddress: newAddressStub }

    newDepositAddress({ logger, engine }, { NewAddressResponse: resSpy })
  })

  it('calls an engine', () => {
    expect(newAddressStub).to.have.been.called()
  })

  it('constructs a NewAddressResponse', () => {
    expect(newAddressStub).to.have.been.called()
  })
})
