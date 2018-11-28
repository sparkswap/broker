const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'identity')
const program = rewire(programPath)

describe('getIdentity', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let publicKey
  let getIdentityStub
  let brokerStub
  let rpcAddress

  const getIdentity = program.__get__('getIdentity')

  beforeEach(() => {
    rpcAddress = undefined
    args = {}
    opts = { rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    publicKey = 'fakeky'
    getIdentityStub = sinon.stub().returns({
      publicKey
    })

    brokerStub = sinon.stub()
    brokerStub.prototype.adminService = { getIdentity: getIdentityStub }

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
    await getIdentity(args, opts, logger)
    expect(getIdentityStub).to.have.been.calledOnce()
    expect(getIdentityStub).to.have.been.calledWith(sinon.match({}))
    expect(getIdentityStub).to.have.been.calledOn(brokerStub.prototype.adminService)
  })

  it('logs the output from the broker', async () => {
    await getIdentity(args, opts, logger)
    expect(infoSpy).to.have.been.calledOnce()
    expect(infoSpy).to.have.been.calledWith(publicKey)
  })
})
