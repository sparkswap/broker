const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const ExternalPreimageService = rewire(path.resolve(__dirname, 'external-preimage-service'))

describe('ExternalPreimageService', () => {
  let getPreimageStub
  let GrpcMethod
  let register
  let fakeRegistered
  let loadProto
  let proto

  let protoPath
  let logger
  let engines

  let server

  beforeEach(() => {
    protoPath = 'fakePath'
    proto = {
      extpreimage: {
        ExternalPreimageService: {
          service: 'fakeService'
        }
      }
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    engines = new Map()

    GrpcMethod = sinon.stub()
    fakeRegistered = sinon.stub()
    register = sinon.stub().returns(fakeRegistered)
    GrpcMethod.prototype.register = register
    ExternalPreimageService.__set__('GrpcServerStreamingMethod', GrpcMethod)

    loadProto = sinon.stub().returns(proto)
    ExternalPreimageService.__set__('loadProto', loadProto)

    getPreimageStub = sinon.stub()
    ExternalPreimageService.__set__('getPreimage', getPreimageStub)
  })

  beforeEach(() => {
    server = new ExternalPreimageService(protoPath, { logger, engines })
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

  it('assigns the definition', () => {
    expect(server).to.have.property('definition')
    expect(server.definition).to.be.equal(proto.extpreimage.ExternalPreimageService.service)
  })

  it('creates a name', () => {
    expect(server).to.have.property('serviceName')
    expect(server.serviceName).to.be.a('string')
    expect(server.serviceName).to.be.eql('ExternalPreimageService')
  })

  it('exposes an implementation', () => {
    expect(server).to.have.property('implementation')
    expect(server.implementation).to.be.an('object')
  })

  describe('#getPreimage', () => {
    let callOrder = 0
    let callArgs

    beforeEach(() => {
      callArgs = GrpcMethod.args[callOrder]
    })

    it('exposes an implementation', () => {
      expect(server.implementation).to.have.property('getPreimage')
      expect(server.implementation.getPreimage).to.be.a('function')
    })

    it('creates a GrpcMethod', () => {
      expect(GrpcMethod).to.have.been.called()
      expect(GrpcMethod).to.have.been.calledWithNew()
      expect(server.implementation.getPreimage).to.be.equal(fakeRegistered)
    })

    it('provides the method', () => {
      expect(callArgs[0]).to.be.equal(getPreimageStub)
    })

    it('provides a message id', () => {
      expect(callArgs[1]).to.be.equal('[ExternalPreimageService:getPreimage]')
    })

    describe('request options', () => {
      it('passes in the logger', () => {
        expect(callArgs[2]).to.have.property('logger', logger)
      })

      it('passes in the engines', () => {
        expect(callArgs[2]).to.have.property('engines', engines)
      })
    })
  })
})
