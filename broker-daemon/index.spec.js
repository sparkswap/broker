const path = require('path')
const { chai, sinon, rewire } = require('test/test-helper')
const { expect } = chai

const brokerDaemon = rewire(path.resolve('broker-daemon'))

describe('broker daemon', () => {
  let GrpcServer
  let listen
  let initializeMarkets
  let level
  let sublevel
  let logger
  let EventEmitter

  beforeEach(() => {
    listen = sinon.stub()
    initializeMarkets = sinon.stub()
    initializeMarkets.resolves(true)

    GrpcServer = sinon.stub().returns({
      listen,
      initializeMarkets
    })
    brokerDaemon.__set__('GrpcServer', GrpcServer)

    level = sinon.stub()
    brokerDaemon.__set__('level', level)

    sublevel = sinon.stub()
    brokerDaemon.__set__('sublevel', sublevel)

    logger = {
      error: sinon.spy(),
      info: sinon.spy()
    }
    brokerDaemon.__set__('logger', logger)

    EventEmitter = sinon.stub()
    brokerDaemon.__set__('EventEmitter', EventEmitter)
  })

  describe('startServer', () => {
    const startServer = brokerDaemon

    it('creates a store', async () => {
      const fakeDataDir = 'my-data'
      const fakeLevel = 'mylevel'
      level.returns(fakeLevel)

      await startServer(null, {
        dataDir: fakeDataDir
      })

      expect(level).to.have.been.calledOnce()
      expect(level).to.have.been.calledWith(fakeDataDir)
      expect(sublevel).to.have.been.calledOnce()
      expect(sublevel).to.have.been.calledWith(fakeLevel)
    })

    it('creates an event handler', async () => {
      await startServer(null, {})

      expect(EventEmitter).to.have.been.calledOnce()
      expect(EventEmitter).to.have.been.calledWithExactly()
      expect(EventEmitter).to.have.been.calledWithNew()
    })

    it('creates a server', async () => {
      const fakeSublevel = 'mysublevel'
      sublevel.returns(fakeSublevel)

      const fakeEventHandler = {}
      EventEmitter.returns(fakeEventHandler)

      await startServer(null, {})

      expect(GrpcServer).to.have.been.calledOnce()
      expect(GrpcServer).to.have.been.calledWith(logger, fakeSublevel, fakeEventHandler)
      expect(GrpcServer).to.have.been.calledWithNew()
    })

    it('initializes markets', async () => {
      const fakeMarkets = 'ABC/XYZ'
      await startServer(null, {
        markets: fakeMarkets
      })

      expect(initializeMarkets).to.have.been.calledOnce()
      expect(initializeMarkets).to.have.been.calledWith(sinon.match([fakeMarkets]))
    })

    it('initializes multiple markets', async () => {
      const fakeMarkets = ['ABC/XYZ', 'BTC/LTC']
      await startServer(null, {
        markets: fakeMarkets.join(',')
      })

      expect(initializeMarkets).to.have.been.calledOnce()
      expect(initializeMarkets).to.have.been.calledWith(sinon.match(fakeMarkets))
    })

    it('does not initialize a null value market', async () => {
      const fakeMarkets = null
      await startServer(null, {
        markets: fakeMarkets
      })

      expect(initializeMarkets).to.have.been.calledWith([])
    })

    it('starts listening', async () => {
      const fakeRpcAddress = '1.1.1.1:3000'
      await startServer(null, {
        rpcAddress: fakeRpcAddress
      })

      expect(listen).to.have.been.calledOnce()
      expect(listen).to.have.been.calledWith(fakeRpcAddress)
    })
  })
})
