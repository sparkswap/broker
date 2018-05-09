const path = require('path')
const {
  chai,
  sinon,
  rewire
} = require('test/test-helper')

const { expect } = chai
const programPath = path.resolve('broker-daemon', 'broker-actions', 'health-check')
const program = rewire(programPath)
const { healthCheck } = program
describe('healthCheck', () => {
  let lndStatusStub
  let relayerStatusStub
  let cbSpy
  let revertLnd
  let revertRelayer

  beforeEach(() => {
    cbSpy = sinon.spy()
    lndStatusStub = sinon.stub().callsFake(() => 'OK')
    relayerStatusStub = sinon.stub().callsFake(() => 'OK')
    revertLnd = program.__set__('lndStatus', lndStatusStub)
    revertRelayer = program.__set__('relayerStatus', relayerStatusStub)
  })

  afterEach(() => {
    revertLnd()
    revertRelayer()
  })

  it('calls lndStatus to retrieve lnd health status', async () => {
    await healthCheck(null, cbSpy)
    expect(lndStatusStub).to.have.been.called()
  })

  it('calls relayer to retrieve relayer health status', async () => {
    await healthCheck(null, cbSpy)
    expect(relayerStatusStub).to.have.been.called()
  })

  it('calls callback to return status values', async () => {
    await healthCheck(null, cbSpy)
    expect(cbSpy).to.have.been.calledWith(null, {lndStatus: 'OK', relayerStatus: 'OK'})
  })
})
