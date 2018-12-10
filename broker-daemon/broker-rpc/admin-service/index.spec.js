const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const AdminService = rewire(path.resolve(__dirname))

describe('AdminService', () => {
  let healthCheckStub
  let getIdentityStub
  let transformLoggerStub
  let transformedLogger

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger

  let relayer
  let engines
  let auth

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      broker: {
        rpc: {
          AdminService: {
            service: 'fakeService'
          },
          HealthCheckResponse: sinon.stub(),
          GetIdentityResponse: sinon.stub()
        }
      }
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    auth = sinon.stub()

    relayer = sinon.stub()
    engines = new Map()

    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    AdminService.__set__('GrpcUnaryMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    AdminService.__set__('loadProto', loadProto)

    healthCheckStub = sinon.stub()
    AdminService.__set__('healthCheck', healthCheckStub)
    AdminService.__set__('getIdentity', getIdentityStub)

    transformedLogger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    transformLoggerStub = sinon.stub().returns(transformedLogger)
    AdminService.__set__('transformLogger', transformLoggerStub)
  })

  beforeEach(() => {
    server = new AdminService(protoPath, { logger, relayer, engines, auth })
  })

  it('assigns a proto path', () => {
    expect(server).to.have.property('protoPath')
    expect(server.protoPath).to.be.equal(protoPath)
  })

  it('loads the proto', () => {
    expect(loadProto).to.have.been.calledOnce()
    expect(loadProto).to.have.been.calledWith(protoPath)
  })

  it('assigns the proto', () => {
    expect(server).to.have.property('proto')
    expect(server.proto).to.be.equal(proto)
  })

  it('assigns a logger', () => {
    expect(server).to.have.property('logger')
    expect(server.logger).to.be.equal(logger)
  })

  it('assigns the definition', () => {
    expect(server).to.have.property('definition')
    expect(server.definition).to.be.equal(proto.broker.rpc.AdminService.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('AdminService')
  })

  it('exposes an implementation', () => {
    expect(server).to.have.property('implementation')
    expect(server.implementation).to.be.an('object')
  })

  describe('#healthCheck', () => {
    let callOrder = 0
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('healthCheck')
      expect(server.implementation.healthCheck).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.healthCheck).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(healthCheckStub)
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[1]).to.have.property('logger', transformedLogger)
      })

      it('passes in a relayer', () => {
        expect(callArgs[1]).to.have.property('relayer', relayer)
      })

      it('passes in the engines', () => {
        expect(callArgs[1]).to.have.property('engines', engines)
      })

      it('passes in auth', () => {
        expect(callArgs[1]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ HealthCheckResponse: proto.broker.rpc.HealthCheckResponse })
    })
  })

  describe('#getIdentity', () => {
    let callOrder = 1
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getIdentity')
      expect(server.implementation.getIdentity).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getIdentity).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getIdentityStub)
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[1]).to.have.property('logger', transformedLogger)
      })

      it('passes in a relayer', () => {
        expect(callArgs[1]).to.have.property('relayer', relayer)
      })

      it('passes in auth', () => {
        expect(callArgs[1]).to.have.property('auth', auth)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ GetIdentityResponse: proto.broker.rpc.GetIdentityResponse })
    })
  })
})
