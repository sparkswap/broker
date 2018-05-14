const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const BrokerDaemon = rewire(path.resolve('broker-daemon'))

describe('broker daemon', () => {
  let grpcServer
  let eventEmitter
  let level
  let sublevel
  let logger
  let brokerDaemon
  let grpcServerListenSpy

  beforeEach(() => {
    level = sinon.stub().returns(sinon.stub())
    sublevel = sinon.stub().returns(sinon.stub())
    grpcServerListenSpy = sinon.spy()
    grpcServer = sinon.stub()
    grpcServer.prototype.listen = grpcServerListenSpy
    eventEmitter = sinon.stub()
    logger = {
      error: sinon.spy(),
      info: sinon.spy()
    }

    BrokerDaemon.__set__('level', level)
    BrokerDaemon.__set__('sublevel', sublevel)
    BrokerDaemon.__set__('events', eventEmitter)
    BrokerDaemon.__set__('./grpc-server', grpcServer)
    BrokerDaemon.__set__('./utils', { logger })

    brokerDaemon = new BrokerDaemon()
  })

  it('starts a grpc server', () => {
    expect(grpcServerListenSpy).to.have.been.calledWith(brokerDaemon.rpcAddress)
  })

  // describe('rpcAddress', () => {
  //   it('sets an address through method parameter')
  //   it('sets an address through an environment variable')
  //   it('sets a default address')
  // })
})
