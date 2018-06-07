const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const healthCheck = rewire(path.resolve(__dirname, 'health-check'))

describe('health-check', () => {
  describe('healthCheck', () => {
    let HealthCheckResponse
    let relayerStub
    let loggerStub
    let engineStatusStub
    let relayerStatusStub
    let statusOK
    let result
    let engineStub
    let reverts = []

    beforeEach(() => {
      relayerStub = sinon.stub()
      engineStub = sinon.stub()
      loggerStub = {
        info: sinon.stub(),
        debug: sinon.stub()
      }
      HealthCheckResponse = sinon.stub()
      engineStatusStub = sinon.stub().returns(statusOK)
      relayerStatusStub = sinon.stub().returns(statusOK)

      statusOK = healthCheck.__get__('STATUS_CODES').OK

      reverts.push(healthCheck.__set__('getEngineStatus', engineStatusStub))
      reverts.push(healthCheck.__set__('getRelayerStatus', relayerStatusStub))
    })

    beforeEach(async () => {
      result = await healthCheck({ relayer: relayerStub, logger: loggerStub, engine: engineStub }, { HealthCheckResponse })
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('calls getEngineStatus to retrieve engine health status', () => {
      expect(engineStatusStub).to.have.been.calledOnce()
      expect(engineStatusStub).to.have.been.calledWith(engineStub)
    })

    it('calls relayer to retrieve relayer health status', () => {
      expect(relayerStatusStub).to.have.been.calledOnce()
      expect(relayerStatusStub).to.have.been.calledWith(relayerStub)
    })

    it('returns status values', async () => {
      expect(result).to.be.an.instanceOf(HealthCheckResponse)
      expect(HealthCheckResponse).to.have.been.calledOnce()
      expect(HealthCheckResponse).to.have.been.calledWith(sinon.match({ engineStatus: statusOK, relayerStatus: statusOK }))
    })
  })

  describe('getEngineStatus', () => {
    let getEngineStatus
    let engineStub
    let isAvailableStub
    let statusOK

    beforeEach(() => {
      isAvailableStub = sinon.stub()
      engineStub = {
        isAvailable: isAvailableStub
      }
      statusOK = healthCheck.__get__('STATUS_CODES').OK
      getEngineStatus = healthCheck.__get__('getEngineStatus')
    })

    it('returns an OK if engine.isAvailable a successful call', async () => {
      const res = await getEngineStatus(engineStub)
      expect(res).to.eql(statusOK)
    })

    it('returns an error if engine.isAvailable fails', async () => {
      const error = 'MY ERROR'
      isAvailableStub.throws(error)
      const res = await getEngineStatus(engineStub)
      expect(res).to.eql(error)
    })
  })

  describe('getRelayerStatus', () => {
    let getRelayerStatus
    let relayerStub
    let healthCheckStub
    let statusOK

    beforeEach(() => {
      healthCheckStub = sinon.stub()
      relayerStub = {
        healthService: {
          check: healthCheckStub
        }
      }
      statusOK = healthCheck.__get__('STATUS_CODES').OK
      getRelayerStatus = healthCheck.__get__('getRelayerStatus')
    })

    it('returns an OK if relayer#healtCheck is successful', async () => {
      const res = await getRelayerStatus(relayerStub)
      expect(res).to.eql(statusOK)
    })

    it('returns an error if the call to relayer fails', async () => {
      const error = 'MY RELAYER ERROR'
      healthCheckStub.throws(error)
      const res = await getRelayerStatus(relayerStub)
      expect(res).to.eql(error)
    })
  })
})
