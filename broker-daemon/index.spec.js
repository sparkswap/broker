const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const BrokerDaemon = rewire(path.resolve('broker-daemon', 'index'))

describe('broker daemon', () => {
  let grpcServer
  let interchainRouter
  let eventEmitter
  let level
  let sublevel
  let logger
  let brokerDaemon
  let grpcServerListenSpy
  let interchainRouterListenSpy
  let initializeMarketsSpy

  beforeEach(() => {
    level = sinon.stub().returns('fake-level')
    sublevel = sinon.stub().returns('fake-sublevel')
    grpcServerListenSpy = sinon.spy()
    initializeMarketsSpy = sinon.spy()
    grpcServer = sinon.stub()
    grpcServer.prototype.listen = grpcServerListenSpy
    grpcServer.prototype.initializeMarkets = initializeMarketsSpy
    interchainRouterListenSpy = sinon.stub()
    interchainRouter = sinon.stub()
    interchainRouter.prototype.listen = interchainRouterListenSpy
    eventEmitter = sinon.stub()
    logger = {
      error: sinon.spy(),
      info: sinon.spy()
    }

    BrokerDaemon.__set__('level', level)
    BrokerDaemon.__set__('sublevel', sublevel)
    BrokerDaemon.__set__('events', eventEmitter)
    BrokerDaemon.__set__('GrpcServer', grpcServer)
    BrokerDaemon.__set__('InterchainRouter', interchainRouter)
    BrokerDaemon.__set__('logger', logger)

    brokerDaemon = new BrokerDaemon()
  })

  describe('grpc server', () => {
    it('starts a grpc server', async () => {
      expect(grpcServerListenSpy).to.have.been.calledWith(brokerDaemon.rpcAddress)
    })
  })

  describe('rpcAddress', () => {
    let defaultAddress

    beforeEach(() => {
      defaultAddress = '0.0.0.0:27492'
    })

    it('sets a default address if parameter and env is not set', async () => {
      expect(brokerDaemon.rpcAddress).to.be.eql(defaultAddress)
    })

    it('sets an rpc address from an ENV variable', async () => {
      const rpcAddress = 'rpcAddress'
      BrokerDaemon.__set__('RPC_ADDRESS', rpcAddress)
      brokerDaemon = new BrokerDaemon()
      expect(brokerDaemon.rpcAddress).to.be.eql(rpcAddress)
    })

    it('sets an RPC address from parameters', async () => {
      let customRpcAddress = '127.0.0.1'
      brokerDaemon = new BrokerDaemon(customRpcAddress)
      expect(brokerDaemon.rpcAddress).to.be.eql(customRpcAddress)
    })
  })

  describe('interchain router', () => {
    it('starts the interchain router', async () => {
      expect(interchainRouterListenSpy).to.have.been.calledWith(brokerDaemon.interchainRouterAddress)
    })
  })

  describe('interchainRouterAddress', () => {
    let defaultAddress

    beforeEach(() => {
      defaultAddress = '0.0.0.0:40369'
    })

    it('sets a default address if parameter and env is not set', async () => {
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(defaultAddress)
    })

    it('sets an rpc address from an ENV variable', async () => {
      const customIRAddress = '127.0.0.1'
      BrokerDaemon.__set__('INTERCHAIN_ROUTER_ADDRESS', customIRAddress)
      brokerDaemon = new BrokerDaemon()
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(customIRAddress)
    })

    it('sets an RPC address from parameters', async () => {
      let customIRAddress = '127.0.0.1'
      brokerDaemon = new BrokerDaemon(null, null, null, customIRAddress)
      expect(brokerDaemon.interchainRouterAddress).to.be.eql(customIRAddress)
    })
  })
})
