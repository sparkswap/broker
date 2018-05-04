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
  //   let lndStatusStub
  //   let relayerStatusStub
  let revert
  let revert2

  beforeEach(() => {
    lndStatusSpy = sinon.spy()
    relayerStatusSpy = sinon.spy()
    cbSpy = sinon.spy()
    // lndStatusStub = sinon.stub().callsFake(() => lndStatusSpy)
    // relayerStatusStub = sinon.stub()

    revert = program.__set__('lndStatus', lndStatusSpy)
    revert2 = program.__set__('relayerStatus', relayerStatusSpy)
  })

  afterEach(() => {
    revert()
    revert2()
  })

  it('calls lndStatus to retrieve lnd health status', () => {
    healthCheck(null, cbSpy)
    expect(lndStatusSpy).to.have.been.called()
  })

  it('calls relayer to retrieve relayer health status', () => {
    healthCheck(null, cbSpy)
    expect(relayerStatusSpy).to.have.been.called()
  })

  it('calls callback to return status values', () => {
    healthCheck(null, cbSpy)
    expect(cbSpy).to.have.been.called()
  })

//   expect(cbSpy).to.have.been.called()
//   calledWith(null, {lndStatus: lndStatusStub, relayerStatus: relayerStatusStub})
})
