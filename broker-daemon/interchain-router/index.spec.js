const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const InterchainRouter = rewire(path.resolve(__dirname))

describe('InterchainRouter', () => {
  let grpc
  let grpcServer
  let ExternalPreimageService
  let logger
  let ordersByHash
  let router
  let engines
  let PROTO_PATH = InterchainRouter.__get__('PROTO_PATH')

  beforeEach(() => {
    grpcServer = {
      addService: sinon.stub(),
      bind: sinon.stub(),
      start: sinon.stub()
    }
    grpc = {
      Server: sinon.stub(),
      ServerCredentials: {
        createInsecure: sinon.stub()
      }
    }
    Object.assign(grpc.Server.prototype, grpcServer)
    InterchainRouter.__set__('grpc', grpc)

    ExternalPreimageService = sinon.stub()
    Object.assign(ExternalPreimageService.prototype, {
      implementation: sinon.stub(),
      definition: sinon.stub()
    })
    InterchainRouter.__set__('ExternalPreimageService', ExternalPreimageService)

    ordersByHash = {
      createReadStream: sinon.stub()
    }

    engines = sinon.stub()

    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      log: sinon.stub()
    }

    router = new InterchainRouter({ ordersByHash, logger, engines })
  })

  describe('#constructor', () => {
    it('assigns an ordersByHash index', () => {
      expect(router).to.have.property('ordersByHash', ordersByHash)
    })

    it('assigns a logger', () => {
      expect(router).to.have.property('logger', logger)
    })

    it('creates a grpc server', () => {
      const serverOptions = InterchainRouter.__get__('GRPC_SERVER_OPTIONS')

      expect(grpc.Server).to.have.been.calledOnce()
      expect(grpc.Server).to.have.been.calledWithExactly(serverOptions)
      expect(grpc.Server).to.have.been.calledWithNew()
      expect(router.server).to.be.instanceOf(grpc.Server)
    })

    it('creates an ExternalPreimageService', () => {
      expect(ExternalPreimageService).to.have.been.calledOnce()
      expect(ExternalPreimageService).to.have.been.calledWithNew()
      expect(ExternalPreimageService).to.have.been.calledWith(PROTO_PATH, { logger, ordersByHash, engines })
      expect(router.externalPreimageService).to.be.instanceOf(ExternalPreimageService)
    })

    it('adds the ExternalPreimageService to the grpc server', () => {
      expect(grpcServer.addService).to.have.been.calledOnce()
      expect(grpcServer.addService).to.have.been.calledWith(ExternalPreimageService.prototype.definition, ExternalPreimageService.prototype.implementation)
    })
  })

  describe('#listen', () => {
    let host

    beforeEach(() => {
      host = '0.0.0.0:12345'
      router.listen(host)
    })

    it('binds to the host', () => {
      expect(grpcServer.bind).to.have.been.calledOnce()
      expect(grpcServer.bind).to.have.been.calledWith(host)
    })

    it('starts the server', () => {
      expect(grpcServer.start).to.have.been.calledOnce()
    })
  })
})
