const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const BrokerDaemon = rewire(path.resolve('broker-daemon', 'index'))

describe('broker daemon', () => {
  let grpcServer
  let eventEmitter
  let level
  let sublevel
  let logger
  let brokerDaemon
  let grpcServerListenSpy
  let initializeMarketsSpy

  beforeEach(() => {
    level = sinon.stub().returns('fake-level')
    sublevel = sinon.stub().returns('fake-sublevel')
    grpcServerListenSpy = sinon.spy()
    initializeMarketsSpy = sinon.spy()
    grpcServer = sinon.stub()
    grpcServer.prototype.listen = grpcServerListenSpy
    grpcServer.prototype.initializeMarkets = initializeMarketsSpy
    eventEmitter = sinon.stub()
    logger = {
      error: sinon.spy(),
      info: sinon.spy()
    }

    BrokerDaemon.__set__('level', level)
    BrokerDaemon.__set__('sublevel', sublevel)
    BrokerDaemon.__set__('events', eventEmitter)
    BrokerDaemon.__set__('GrpcServer', grpcServer)
    BrokerDaemon.__set__('logger', logger)

    brokerDaemon = new BrokerDaemon()
  })

  describe('grpc server', () => {
    it('starts a grpc server', async () => {
      await brokerDaemon
      expect(grpcServerListenSpy).to.have.been.calledWith(brokerDaemon.rpcAddress)
    })
  })

  describe('rpcAddress', () => {
    let defaultAddress
    let rpcAddress

    beforeEach(() => {
      defaultAddress = '0.0.0.0:27492'
      rpcAddress = 'rpcAddress'
      BrokerDaemon.__set__('RPC_ADDRESS', rpcAddress)
    })

    it('sets a default address if parameter and env is not set', async () => {
      await brokerDaemon
      expect(brokerDaemon.rpcAddress).to.be.eql(defaultAddress)
    })

    it('sets an rpc address from an ENV variable', async () => {
      await brokerDaemon
      expect(brokerDaemon.rpcAddress).to.be.eql(rpcAddress)
    })

    it('sets an RPC address from parameters', async () => {
      let customRpcAddress = '127.0.0.1'
      brokerDaemon = await new BrokerDaemon(customRpcAddress)
      expect(brokerDaemon.rpcAddress).to.be.eql(customRpcAddress)
    })
  })
})
