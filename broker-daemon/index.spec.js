const path = require('path')
const { chai, sinon, rewire } = require('test/test-helper')
const { expect } = chai

const brokerDaemon = rewire(path.resolve('broker-daemon'))

describe('broker daemon', () => {
  let GrpcServer
  let listen
  let level
  let sublevel
  let logger
  let EventEmitter

  beforeEach(() => {
    listen = sinon.stub()

    GrpcServer = sinon.stub().returns({
      listen
    })
    brokerDaemon.__set__('GrpcServer', GrpcServer)

    level = sinon.stub()
    brokerDaemon.__set__('level', level)

    sublevel = sinon.stub()
    brokerDaemon.__set__('sublevel', sublevel)

    logger = {
      info: sinon.spy(),
      error: sinon.spy()
    }

    EventEmitter = sinon.stub()
    brokerDaemon.__set__('EventEmitter', EventEmitter)
  })

  describe('startServer', () => {
    const startServer = brokerDaemon

    it('creates a store', () => {
      const fakeDataDir = 'my-data'
      const fakeLevel = 'mylevel'
      level.returns(fakeLevel)

      startServer(null, {
        dataDir: fakeDataDir
      }, logger)

      expect(level).to.have.been.calledOnce()
      expect(level).to.have.been.calledWith(fakeDataDir)
      expect(sublevel).to.have.been.calledOnce()
      expect(sublevel).to.have.been.calledWith(fakeLevel)
    })

    it('creates an event handler', () => {
      startServer(null, {}, logger)

      expect(EventEmitter).to.have.been.calledOnce()
      expect(EventEmitter).to.have.been.calledWithExactly()
      expect(EventEmitter).to.have.been.calledWithNew()
    })

    it('creates a server', () => {
      const fakeSublevel = 'mysublevel'
      sublevel.returns(fakeSublevel)

      const fakeEventHandler = {}
      EventEmitter.returns(fakeEventHandler)

      startServer(null, {}, logger)

      expect(GrpcServer).to.have.been.calledOnce()
      expect(GrpcServer).to.have.been.calledWith(logger, fakeSublevel, fakeEventHandler)
      expect(GrpcServer).to.have.been.calledWithNew()
    })

    it('starts listening', () => {
      const fakeRpcAddress = '1.1.1.1:3000'
      startServer(null, {
        rpcAddress: fakeRpcAddress
      }, logger)

      expect(listen).to.have.been.calledOnce()
      expect(listen).to.have.been.calledWith(fakeRpcAddress)
    })
  })
})
