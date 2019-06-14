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
    let store
    let engines
    let reverts = []
    let orderbooks
    let orderbookStub
    let eachRecordStub
    let params

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

      store = {
        sublevels: {
          sublevel: {
            sublevels: {},
            _numRecords: 3
          }
        },
        _numRecords: 7
      }

      params = {}

      loggerStub = {
        info: sinon.stub(),
        debug: sinon.stub()
      }
      HealthCheckResponse = sinon.stub()
      orderbookStatusOK = healthCheck.__get__('ORDERBOOK_STATUS_CODES').ORDERBOOK_OK
      relayerStatusOK = healthCheck.__get__('RELAYER_STATUS_CODES').RELAYER_OK
      relayerStatusStub = sinon.stub().returns(relayerStatusOK)

      // simulate looping over every record in the store, using the stub's
      // _numRecords as an indicator of how many records are in our fake store.
      eachRecordStub = sinon.stub().callsFake(({ _numRecords }, cb) => {
        return new Promise(async (resolve, reject) => {
          for (let i = 0; i < _numRecords; i++) {
            await cb()
          }

          resolve()
        })
      })

      reverts.push(healthCheck.__set__('getRelayerStatus', relayerStatusStub))
      reverts.push(healthCheck.__set__('eachRecord', eachRecordStub))
    })

    beforeEach(async () => {
      result = await healthCheck(
        {
          params,
          relayer: relayerStub,
          logger: loggerStub,
          engines,
          orderbooks
        },
        { HealthCheckResponse }
      )
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

    it('includes record counts if the flag is passed', async () => {
      await healthCheck(
        {
          params: { includeRecordCounts: true },
          relayer: relayerStub,
          logger: loggerStub,
          engines,
          orderbooks,
          store
        },
        { HealthCheckResponse }
      )

      expect(HealthCheckResponse).to.have.been.calledWith(sinon.match(
        {
          recordCounts: [
            {
              name: 'store',
              parentName: '',
              count: 7
            },
            {
              name: 'sublevel',
              parentName: 'store',
              count: 3
            }
          ]
        }
      ))
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
      const res = await getRelayerStatus(relayerStub, { logger })
      expect(res).to.eql('RELAYER_OK')
    })

    it('returns an UNAVAILABLE status code if the call to relayer fails', async () => {
      healthCheckStub.throws()
      const res = await getRelayerStatus(relayerStub, { logger })
      expect(res).to.eql('RELAYER_UNAVAILABLE')
    })
  })
})
