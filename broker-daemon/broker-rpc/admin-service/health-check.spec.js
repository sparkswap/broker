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
    let orderbookStatusOK
    let relayerStatusOK
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
      orderbookStatusOK = healthCheck.__get__('ORDERBOOK_STATUS_CODES').ORDERBOOK_OK
      relayerStatusOK = healthCheck.__get__('RELAYER_STATUS_CODES').RELAYER_OK
      relayerStatusStub = sinon.stub().returns(relayerStatusOK)

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
            { symbol: 'BTC', status: 'OK' },
            { symbol: 'LTC', status: 'OK' }
          ],
          relayerStatus: relayerStatusOK,
          orderbookStatus: [
            { market: 'BTC/LTC', status: orderbookStatusOK }
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
        adminService: {
          healthCheck: healthCheckStub
        }
      }
      getRelayerStatus = healthCheck.__get__('getRelayerStatus')
    })

    it('returns an OK if relayer#healthCheck is successful', async () => {
      const { RELAYER_OK } = healthCheck.__get__('RELAYER_STATUS_CODES')
      const res = await getRelayerStatus(relayerStub, { logger })
      expect(res).to.eql(RELAYER_OK)
    })

    it('returns an UNAVAILABLE status code if the call to relayer fails', async () => {
      const { RELAYER_UNAVAILABLE } = healthCheck.__get__('RELAYER_STATUS_CODES')
      healthCheckStub.throws()
      const res = await getRelayerStatus(relayerStub, { logger })
      expect(res).to.eql(RELAYER_UNAVAILABLE)
    })
  })
})
