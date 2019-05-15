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
  let infoSpy
  let errorSpy
  let healthCheckStub
  let brokerStub
  let rpcAddress
  let instanceTableStub
  let tableStub
  let jsonStub
  let healthCheckResponse
  let reverts

  const healthCheck = program.__get__('healthCheck')

  beforeEach(() => {
    reverts = []
    jsonStub = {
      stringify: sinon.stub()
    }
    rpcAddress = undefined
    args = {}
    opts = { rpcAddress }
    infoSpy = sinon.spy()
    errorSpy = sinon.spy()
    healthCheckResponse = {
      engineStatus: [
        { symbol: 'BTC', status: 'VALIDATED' },
        { symbol: 'LTC', status: 'NOT_SYNCED' }
      ],
      relayerStatus: 'RELAYER_OK',
      orderbookStatus: [
        { market: 'BTC/LTC', status: 'ORDERBOOK_OK' },
        { market: 'ABC/XYZ', status: 'ORDERBOOK_NOT_SYNCED' }
      ]
    }
    healthCheckStub = sinon.stub().returns(healthCheckResponse)
    instanceTableStub = { push: sinon.stub() }
    tableStub = sinon.stub().returns(instanceTableStub)

    brokerStub = sinon.stub()
    brokerStub.prototype.adminService = { healthCheck: healthCheckStub }

    reverts.push(program.__set__('Table', tableStub))
    reverts.push(program.__set__('BrokerDaemonClient', brokerStub))
    reverts.push(program.__set__('JSON', jsonStub))

    logger = {
      info: infoSpy,
      error: errorSpy
    }
  })

  afterEach(() => {
    reverts.forEach(r => r())
  })

  it('makes a request to the broker', async () => {
    await healthCheck(args, opts, logger)
    expect(healthCheckStub).to.have.been.called()
  })

  it('returns json if the user specifies a json flag', async () => {
    opts.json = true
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.not.have.been.called()
    expect(jsonStub.stringify).to.have.been.calledWith(healthCheckResponse)
  })

  it('adds engine statuses to the healthcheck table', async () => {
    await healthCheck(args, opts, logger)
    expect(instanceTableStub.push).to.have.been.calledWith(['BTC Engine', 'OK'.green])
    expect(instanceTableStub.push).to.have.been.calledWith(['LTC Engine', 'NOT_SYNCED'.red])
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
    expect(instanceTableStub.push).to.have.been.calledWith(['ABC/XYZ Orderbook', 'ORDERBOOK_NOT_SYNCED'.red])
  })
})
