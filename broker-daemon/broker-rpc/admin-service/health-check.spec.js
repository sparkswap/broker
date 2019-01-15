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
    let relayerStatusStub
    let statusOK
    let result
    let engineStub
    let engines
    let reverts = []
    let orderbooks
    let orderbookStub

    beforeEach(() => {
      relayerStub = sinon.stub()
      engines = new Map()
      engineStub = {
        status: 'OK'
      }
      engines.set('BTC', engineStub)
      engines.set('LTC', engineStub)

      orderbooks = new Map()
      orderbookStub = {
        synced: true
      }
      orderbooks.set('BTC/LTC', orderbookStub)
      loggerStub = {
        info: sinon.stub(),
        debug: sinon.stub()
      }
      HealthCheckResponse = sinon.stub()
      statusOK = healthCheck.__get__('STATUS_CODES').OK
      relayerStatusStub = sinon.stub().returns(statusOK)

      reverts.push(healthCheck.__set__('getRelayerStatus', relayerStatusStub))
    })

    beforeEach(async () => {
      result = await healthCheck({ relayer: relayerStub, logger: loggerStub, engines, orderbooks }, { HealthCheckResponse })
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('calls relayer to retrieve relayer health status', () => {
      expect(relayerStatusStub).to.have.been.calledOnce()
      expect(relayerStatusStub).to.have.been.calledWith(relayerStub)
    })

    it('returns status values', async () => {
      expect(result).to.be.an.instanceOf(HealthCheckResponse)
      expect(HealthCheckResponse).to.have.been.calledOnce()
      expect(HealthCheckResponse).to.have.been.calledWith(sinon.match(
        {
          engineStatus: [
            { symbol: 'BTC', status: statusOK },
            { symbol: 'LTC', status: statusOK }
          ],
          relayerStatus: statusOK,
          orderbookStatus: [
            { market: 'BTC/LTC', synced: true }
          ]
        }))
    })
  })

  describe('getRelayerStatus', () => {
    let getRelayerStatus
    let relayerStub
    let healthCheckStub
    let logger

    beforeEach(() => {
      logger = {
        error: sinon.stub()
      }
      healthCheckStub = sinon.stub()
      relayerStub = {
        healthService: {
          check: healthCheckStub
        }
      }
      getRelayerStatus = healthCheck.__get__('getRelayerStatus')
    })

    it('returns an OK if relayer#healtCheck is successful', async () => {
      const { OK } = healthCheck.__get__('STATUS_CODES')
      const res = await getRelayerStatus(relayerStub, { logger })
      expect(res).to.eql(OK)
    })

    it('returns an UNAVAILABLE status code if the call to relayer fails', async () => {
      const { UNAVAILABLE } = healthCheck.__get__('STATUS_CODES')
      healthCheckStub.throws()
      const res = await getRelayerStatus(relayerStub, { logger })
      expect(res).to.eql(UNAVAILABLE)
    })
  })
})
