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
    let engines
    let reverts = []

    beforeEach(() => {
      relayerStub = sinon.stub()
      engines = new Map()
      engineStub = sinon.stub()
      engines.set('BTC', engineStub)
      engines.set('LTC', engineStub)
      loggerStub = {
        info: sinon.stub(),
        debug: sinon.stub()
      }
      HealthCheckResponse = sinon.stub()
      engineStatusStub = sinon.stub()
      engineStatusStub.onFirstCall().resolves({ symbol: 'BTC', status: statusOK })
      engineStatusStub.onSecondCall().resolves({ symbol: 'LTC', status: statusOK })
      relayerStatusStub = sinon.stub().returns(statusOK)

      statusOK = healthCheck.__get__('STATUS_CODES').OK

      reverts.push(healthCheck.__set__('getEngineStatus', engineStatusStub))
      reverts.push(healthCheck.__set__('getRelayerStatus', relayerStatusStub))
    })

    beforeEach(async () => {
      result = await healthCheck({ relayer: relayerStub, logger: loggerStub, engines: engines }, { HealthCheckResponse })
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('calls getEngineStatus to retrieve engine health status', () => {
      expect(engineStatusStub).to.have.been.calledTwice()
    })

    it('calls relayer to retrieve relayer health status', () => {
      expect(relayerStatusStub).to.have.been.calledOnce()
      expect(relayerStatusStub).to.have.been.calledWith(relayerStub)
    })

    it('returns status values', async () => {
      expect(result).to.be.an.instanceOf(HealthCheckResponse)
      expect(HealthCheckResponse).to.have.been.calledOnce()
      expect(HealthCheckResponse).to.have.been.calledWith(sinon.match({ engineStatus: [ { symbol: 'BTC', status: statusOK }, { symbol: 'LTC', status: statusOK } ], relayerStatus: statusOK }))
    })
  })

  describe('getEngineStatus', () => {
    const symbol = 'BTC'

    let getEngineStatus
    let engineStub

    beforeEach(() => {
      engineStub = {
        isAvailable: sinon.stub().resolves(true),
        unlocked: true
      }
      getEngineStatus = healthCheck.__get__('getEngineStatus')
    })

    it('returns an OK response engine is available', async () => {
      const { OK } = healthCheck.__get__('STATUS_CODES')
      const res = await getEngineStatus([ symbol, engineStub ])
      expect(res).to.eql({ symbol, status: OK })
    })

    it('returns a LOCKED response if engine is available but locked', async () => {
      const { LOCKED } = healthCheck.__get__('STATUS_CODES')
      engineStub.unlocked = false
      const res = await getEngineStatus([ symbol, engineStub ])
      expect(res).to.eql({ symbol, status: LOCKED })
    })

    it('returns NOT_AVAILABLE if engine is not available', async () => {
      const { NOT_AVAILABLE } = healthCheck.__get__('STATUS_CODES')
      engineStub.isAvailable.resolves(false)
      const res = await getEngineStatus([ symbol, engineStub ])
      expect(res).to.eql({ symbol, status: NOT_AVAILABLE })
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
