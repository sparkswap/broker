const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'register')
const program = rewire(programPath)

describe('register', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let url
  let registerStub
  let brokerStub
  let rpcAddress

  const register = program.__get__('register')

  beforeEach(() => {
    rpcAddress = undefined
    args = {}
    opts = { rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    url = 'https://sparkwap.com/register/blahblahentityId'
    registerStub = sinon.stub().returns({
      url
    })

    brokerStub = sinon.stub()
    brokerStub.prototype.adminService = { register: registerStub }

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
    await register(args, opts, logger)
    expect(registerStub).to.have.been.calledOnce()
    expect(registerStub).to.have.been.calledWith(sinon.match({}))
    expect(registerStub).to.have.been.calledOn(brokerStub.prototype.adminService)
  })

  it('logs the output from the broker', async () => {
    await register(args, opts, logger)
    expect(infoSpy).to.have.been.calledOnce()
    expect(infoSpy).to.have.been.calledWith(`Successfully registered public key with Sparkswap Relayer. Go to ${url.cyan} to complete registration.`)
  })
})
