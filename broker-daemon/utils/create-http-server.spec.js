const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createHttpServer = rewire(path.resolve(__dirname, 'create-http-server'))

describe('createHttpServer', () => {
  let protoPath
  let rpcAddress
  let expressStub
  let bodyParserStub
  let grpcGatewayStub
  let grpcGateway
  let corsMiddlewareStub
  let express
  let options

  describe('http server creation', () => {
    beforeEach(() => {
      options = {
        disableAuth: true,
        privKeyPath: 'priv-key',
        pubKeyPath: 'pub-key',
        logger: {},
        httpMethods: [ 'fake/method' ]
      }
      protoPath = '/path/to/proto'
      rpcAddress = 'my-daemon-rpc-address:8080'
      expressStub = { use: sinon.stub() }
      bodyParserStub = { json: sinon.stub(), urlencoded: sinon.stub() }
      grpcGateway = { fake: 'gateway' }
      grpcGatewayStub = sinon.stub().returns(grpcGateway)
      corsMiddlewareStub = sinon.stub()
      express = sinon.stub().returns(expressStub)
      createHttpServer.__set__('express', express)
      createHttpServer.__set__('bodyParser', bodyParserStub)
      createHttpServer.__set__('grpcGateway', grpcGatewayStub)
      createHttpServer.__set__('corsMiddleware', corsMiddlewareStub)
    })

    beforeEach(() => {
      createHttpServer(protoPath, rpcAddress, options)
    })

    it('creates a new express app', () => {
      expect(express).to.have.been.calledOnce()
    })

    it('sets the app to parse JSON payloads', () => {
      expect(expressStub.use).to.have.been.calledWith(bodyParserStub.json())
    })

    it('sets the app to parse urlencoded bodies', () => {
      expect(expressStub.use).to.have.been.calledWith(bodyParserStub.urlencoded())
    })

    it('sets the app to use grpcGateway defined routing', () => {
      expect(expressStub.use).to.have.been.calledWith('/', grpcGateway)
    })

    it('uses the rpc address specified in the daemon', () => {
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, rpcAddress)
    })

    it('prefixes with the proto path', () => {
      expect(grpcGatewayStub).to.have.been.calledWith([`/${protoPath}`])
    })

    it('passes the whitelist of methods', () => {
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ whitelist: options.httpMethods }))
    })

    it('returns the configured app', () => {
      expect(createHttpServer(protoPath, rpcAddress, options)).to.eql(expressStub)
    })
  })

  describe('https server creation', () => {
    let readFileSyncStub
    let pubKey
    let privKey
    let channelCredentialStub
    let createServerStub
    let httpsApp
    let createSsl

    beforeEach(() => {
      readFileSyncStub = sinon.stub()
      channelCredentialStub = sinon.stub()
      httpsApp = sinon.stub()
      createServerStub = sinon.stub().returns(httpsApp)
      options = {
        disableAuth: false,
        privKeyPath: 'priv-key',
        pubKeyPath: 'pub-key',
        logger: {
          debug: sinon.stub()
        },
        httpMethods: [ 'fake/method' ]
      }
      pubKey = 'pubkey'
      privKey = 'privkey'
      readFileSyncStub.withArgs(options.privKeyPath).returns(privKey)
      readFileSyncStub.withArgs(options.pubKeyPath).returns(pubKey)
      protoPath = '/path/to/proto'
      rpcAddress = 'my-daemon-rpc-address:8080'
      expressStub = { use: sinon.stub() }
      bodyParserStub = { json: sinon.stub(), urlencoded: sinon.stub() }
      grpcGateway = { fake: 'gateway' }
      grpcGatewayStub = sinon.stub().returns(grpcGateway)
      corsMiddlewareStub = sinon.stub()
      express = sinon.stub().returns(expressStub)
      createSsl = sinon.stub().returns(channelCredentialStub)

      createHttpServer.__set__('express', express)
      createHttpServer.__set__('bodyParser', bodyParserStub)
      createHttpServer.__set__('grpcGateway', grpcGatewayStub)
      createHttpServer.__set__('corsMiddleware', corsMiddlewareStub)
      createHttpServer.__set__('grpc', {
        credentials: {
          createSsl
        }
      })
      createHttpServer.__set__('fs', {
        readFileSync: readFileSyncStub
      })
      createHttpServer.__set__('https', {
        createServer: createServerStub
      })
    })

    beforeEach(() => {
      createHttpServer(protoPath, rpcAddress, options)
    })

    it('creates a new express app', () => {
      expect(express).to.have.been.calledOnce()
    })

    it('sets the app to parse JSON payloads', () => {
      expect(expressStub.use).to.have.been.calledWith(bodyParserStub.json())
    })

    it('sets the app to parse urlencoded bodies', () => {
      expect(expressStub.use).to.have.been.calledWith(bodyParserStub.urlencoded())
    })

    it('sets the app to use grpcGateway defined routing with grpc credentials', () => {
      expect(expressStub.use).to.have.been.calledWith('/', grpcGateway)
    })

    it('uses the rpc address specified in the daemon', () => {
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, rpcAddress, sinon.match.any)
    })

    it('prefixes with the proto path', () => {
      expect(grpcGatewayStub).to.have.been.calledWith([`/${protoPath}`])
    })

    it('uses the self signed cert to secure the connection', () => {
      expect(createSsl).to.have.been.calledWith(pubKey)
    })

    it('uses a non self signed cert to secure the connection', () => {
      createSsl.reset()

      options.isCertSelfSigned = false
      createHttpServer(protoPath, rpcAddress, options)

      expect(createSsl).to.have.been.calledOnce()
      expect(createSsl).to.not.have.been.calledWith(pubKey)
    })

    it('uses channel credentials to secure the connection', () => {
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ credentials: channelCredentialStub }))
    })

    it('passes the whitelist of methods', () => {
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match({ whitelist: options.httpMethods }))
    })

    it('creates an https server', () => {
      expect(createServerStub).to.have.been.calledWith({ key: privKey, cert: pubKey }, expressStub)
    })

    it('returns an https app', () => {
      expect(createHttpServer(protoPath, rpcAddress, options)).to.eql(httpsApp)
    })
  })

  describe('cors', () => {
    let fakeCors = () => {}

    beforeEach(() => {
      options = {
        disableAuth: true,
        enableCors: true,
        privKeyPath: 'priv-key',
        pubKeyPath: 'pub-key',
        logger: {}
      }
      protoPath = '/path/to/proto'
      rpcAddress = '0.0.0.0:8080'
      expressStub = { use: sinon.stub() }
      bodyParserStub = { json: sinon.stub(), urlencoded: sinon.stub() }
      grpcGatewayStub = sinon.stub().withArgs([`/${protoPath}`], rpcAddress)
      corsMiddlewareStub = sinon.stub().returns(fakeCors)
      express = sinon.stub().returns(expressStub)
      createHttpServer.__set__('express', express)
      createHttpServer.__set__('bodyParser', bodyParserStub)
      createHttpServer.__set__('grpcGateway', grpcGatewayStub)
      createHttpServer.__set__('corsMiddleware', corsMiddlewareStub)
    })

    beforeEach(() => {
      createHttpServer(protoPath, rpcAddress, options)
    })

    it('adds cors to all routes', () => {
      expect(corsMiddlewareStub).to.have.been.calledOnce()
      expect(expressStub.use).to.have.been.calledWith(fakeCors)
    })
  })
})
