const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const AdminService = rewire(path.resolve(__dirname))

describe('AdminService', () => {
  let healthCheckStub

  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger

  let relayer
  let engine
  let engines

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      AdminService: {
        service: 'fakeService'
      },
      HealthCheckResponse: sinon.stub()
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    relayer = sinon.stub()
    engine = sinon.stub()
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
  })

  beforeEach(() => {
    server = new AdminService(protoPath, { logger, relayer, engine, engines })
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
    expect(server.definition).to.be.equal(proto.AdminService.service)
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

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[AdminService:healthCheck]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger')
        expect(callArgs[2].logger).to.be.equal(logger)
      })

      it('passes in a relayer', () => {
        expect(callArgs[2]).to.have.property('relayer')
        expect(callArgs[2].relayer).to.be.equal(relayer)
      })

      it('passes in the engines', () => {
        expect(callArgs[2]).to.have.property('engines')
        expect(callArgs[2].engines).to.be.equal(engines)
      })
    })

    it('passes in the response', () => {
      expect(callArgs[3]).to.be.eql({ HealthCheckResponse: proto.HealthCheckResponse })
    })
  })
})
