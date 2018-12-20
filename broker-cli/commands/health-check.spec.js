const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'health-check')
const program = rewire(programPath)

describe('healthCheck', () => {
  let args
  let opts
  let logger
  let revert
  let infoSpy
  let errorSpy
  let healthCheckStub
  let brokerStub
  let rpcAddress

  const healthCheck = program.__get__('healthCheck')

  beforeEach(() => {
    rpcAddress = undefined
    args = {}
    opts = { rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    healthCheckStub = sinon.stub().returns({
      engineStatus: [
        { symbol: 'BTC', status: 'VALIDATED' },
        { symbol: 'LTC', status: 'NOT VALIDATED' }
      ],
      relayerStatus: 'OK'
    })

    brokerStub = sinon.stub()
    brokerStub.prototype.adminService = { healthCheck: healthCheckStub }

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
    await healthCheck(args, opts, logger)
    expect(healthCheckStub).to.have.been.called()
  })

  it('logs ok engine status if engine is validated', async () => {
    await healthCheck(args, opts, logger)
    expect(logger.info).to.have.been.calledWith('Engine status for BTC: ' + 'OK'.green)
  })

  it('logs other engine status if engine is not validated', async () => {
    await healthCheck(args, opts, logger)
    expect(logger.info).to.have.been.calledWith('Engine status for LTC: ' + 'NOT VALIDATED'.red)
  })
})
