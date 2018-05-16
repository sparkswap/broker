const path = require('path')
const {
  chai,
  sinon,
  rewire
} = require('test/test-helper')

const { expect } = chai
const programPath = path.resolve(__dirname, 'health-check')
const program = rewire(programPath)
const healthCheck = program
describe('healthCheck', () => {
  let engineStatusStub
  let relayerStatusStub
  let cbSpy
  let revertLnd
  let revertRelayer

  beforeEach(() => {
    cbSpy = sinon.spy()
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
    await healthCheck(null, cbSpy)
    expect(engineStatusStub).to.have.been.called()
  })

  it('calls relayer to retrieve relayer health status', async () => {
    await healthCheck(null, cbSpy)
    expect(relayerStatusStub).to.have.been.called()
  })

  it('calls callback to return status values', async () => {
    await healthCheck(null, cbSpy)
    expect(cbSpy).to.have.been.calledWith(null, {engineStatus: 'OK', relayerStatus: 'OK'})
  })
})
