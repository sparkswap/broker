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
  let lndStatusSpy
  let relayerStatusSpy
  let cbSpy
  let revertLnd
  let revertRelayer

  beforeEach(() => {
    lndStatusSpy = sinon.spy()
    relayerStatusSpy = sinon.spy()
    cbSpy = sinon.spy()

    revertLnd = program.__set__('lndStatus', lndStatusSpy)
    revertRelayer = program.__set__('relayerStatus', relayerStatusSpy)
  })

  afterEach(() => {
    revertLnd()
    revertRelayer()
  })

  it('calls lndStatus to retrieve lnd health status', async () => {
    await healthCheck(null, cbSpy)
    expect(lndStatusSpy).to.have.been.called()
  })

  it('calls relayer to retrieve relayer health status', async () => {
    await healthCheck(null, cbSpy)
    expect(relayerStatusSpy).to.have.been.called()
  })

  it('calls callback to return status values', async () => {
    await healthCheck(null, cbSpy)
    expect(cbSpy).to.have.been.called()
  })
})
