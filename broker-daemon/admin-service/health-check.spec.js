const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'health-check')
const program = rewire(programPath)
const healthCheck = program
describe('healthCheck', () => {
  let HealthCheckResponse
  let relayerStub
  let engineStatusStub
  let relayerStatusStub
  let revertLnd
  let revertRelayer

  beforeEach(() => {
    relayerStub = sinon.stub()
    HealthCheckResponse = sinon.stub()
    engineStatusStub = sinon.stub().callsFake(() => 'OK')
    relayerStatusStub = sinon.stub().callsFake(() => 'OK')
    revertLnd = program.__set__('engineStatus', engineStatusStub)
    revertRelayer = program.__set__('relayerStatus', relayerStatusStub)
  })

  afterEach(() => {
    revertLnd()
    revertRelayer()
  })

  it('calls engineStatus to retrieve lnd health status', async () => {
    await healthCheck({ relayer: relayerStub }, { HealthCheckResponse })
    expect(engineStatusStub).to.have.been.called()
  })

  it('calls relayer to retrieve relayer health status', async () => {
    await healthCheck({ relayer: relayerStub }, { HealthCheckResponse })
    expect(relayerStatusStub).to.have.been.called()
    expect(relayerStatusStub).to.have.been.calledWith(relayerStub)
  })

  it('returns status values', async () => {
    const res = await healthCheck({ relary: relayerStub }, { HealthCheckResponse })
    expect(res).to.be.an.instanceOf(HealthCheckResponse)
    expect(HealthCheckResponse).to.have.been.calledOnce()
    expect(HealthCheckResponse).to.have.been.calledWith(sinon.match({ engineStatus: 'OK', relayerStatus: 'OK' }))
  })
})
