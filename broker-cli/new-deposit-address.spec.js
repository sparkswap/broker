const path = require('path')
const {
  chai,
  sinon,
  rewire
} = require('test/test-helper')

const { expect } = chai
const program = rewire(path.resolve('broker-cli', 'new-deposit-address'))

describe('newDepositAddress', () => {
  const deposit = program.__get__('newDepositAddress')

  let rpcAddress
  let args
  let opts
  let infoSpy
  let errorSpy
  let newWalletStub
  let brokerStub
  let revert
  let logger
  let brokerResponse

  beforeEach(() => {
    rpcAddress = undefined
    args = {}
    opts = { rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    brokerResponse = { address: 'newaddress' }
    newWalletStub = sinon.stub().returns(brokerResponse)

    brokerStub = sinon.stub()
    brokerStub.prototype.newDepositAddress = newWalletStub

    revert = program.__set__('BrokerDaemonClient', brokerStub)

    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    revert()
  })

  it('makes a request to the broker', async () => {
    await deposit(args, opts, logger)
    expect(brokerStub).to.have.been.calledWith(null)
    expect(newWalletStub).to.have.been.called()
  })

  it('returns a response', async () => {
    await deposit(args, opts, logger)
    expect(infoSpy).to.have.been.calledWith(brokerResponse.address)
  })
})
