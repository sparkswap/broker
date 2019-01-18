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
  let instanceTableStub
  let tableStub
  let revertTable
  let healthStatus

  const healthCheck = program.__get__('healthCheck')

  beforeEach(() => {
    rpcAddress = undefined
    args = {}
    opts = { rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    healthStatus = {
      engineStatus: [
        { symbol: 'BTC', status: 'VALIDATED' },
        { symbol: 'LTC', status: 'NOT VALIDATED' }
      ],
      relayerStatus: 'OK',
      orderbookStatus: [
        { market: 'BTC/LTC', status: 'OK' },
        { market: 'ABC/XYZ', status: 'NOT_SYNCED' }
      ]
    }
    healthCheckStub = sinon.stub().returns(healthStatus)
    instanceTableStub = {push: sinon.stub()}
    tableStub = sinon.stub().returns(instanceTableStub)
    revertTable = program.__set__('Table', tableStub)

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
    revertTable()
  })

  it('makes a request to the broker', async () => {
    await healthCheck(args, opts, logger)
    expect(healthCheckStub).to.have.been.called()
  })

  it('adds engine statuses to the healthcheck table', async () => {
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.have.been.calledWith(['BTC Engine', 'OK'.green])
    expect(instanceTableStub.push).to.have.been.calledWith(['LTC Engine', 'NOT VALIDATED'.red])
  })

  it('adds engine error status if no engines are returned', async () => {
    healthCheckStub = sinon.stub().returns({
      relayerStatus: 'OK',
      orderbookStatus: [
        { market: 'BTC/LTC', status: 'OK' },
        { market: 'ABC/XYZ', status: 'NOT_SYNCED' }
      ]
    })
    brokerStub.prototype.adminService = { healthCheck: healthCheckStub }
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.have.been.calledWith(['Engines', 'No Statuses Returned'.red])
  })

  it('adds relayer status to the healthcheck table', async () => {
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.have.been.calledWith(['Relayer', 'OK'.green])
  })

  it('adds daemon status to the healthcheck table', async () => {
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.have.been.calledWith(['Daemon', 'OK'.green])
  })

  it('adds orderbook status to the healthcheck table', async () => {
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.have.been.calledWith(['BTC/LTC Orderbook', 'OK'.green])
    expect(instanceTableStub.push).to.have.been.calledWith(['ABC/XYZ Orderbook', 'NOT_SYNCED'.red])
  })

  describe('with json output', () => {
    let json
    let consoleStub

    beforeEach(() => {
      json = true
      consoleStub = { log: sinon.stub() }
      program.__set__('console', consoleStub)
      opts = { rpcAddress, json }
    })

    it('makes a request to the broker', async () => {
      await healthCheck(args, opts, logger)
      expect(healthCheckStub).to.have.been.called()
    })

    it('does not create a table', async () => {
      await healthCheck(args, opts, logger)
      expect(instanceTableStub.push).to.not.have.been.called()
    })

    it('logs health status to ', async () => {
      await healthCheck(args, opts, logger)
      expect(consoleStub.log).to.have.been.calledWith(healthStatus)
    })
  })
})
