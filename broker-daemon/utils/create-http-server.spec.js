const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createHttpServer = rewire(path.resolve(__dirname, 'create-http-server'))

describe('createHttpServer', () => {
  let protoPath
  let rpcAddress
  let expressStub
  let bodyParserStub
  let grpcGatewayStub
  let express
  let options

  describe('http server creation', () => {
    beforeEach(() => {
      options = {
        disableAuth: true,
        privKeyPath: 'priv-key',
        pubKeyPath: 'pub-key',
        logger: {}
      }
      protoPath = '/path/to/proto'
      rpcAddress = '0.0.0.0:8080'
      expressStub = { use: sinon.stub() }
      bodyParserStub = { json: sinon.stub(), urlencoded: sinon.stub() }
      grpcGatewayStub = sinon.stub().withArgs([`/${protoPath}`], rpcAddress)
      express = sinon.stub().returns(expressStub)
      createHttpServer.__set__('express', express)
      createHttpServer.__set__('bodyParser', bodyParserStub)
      createHttpServer.__set__('grpcGateway', grpcGatewayStub)
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
      expect(expressStub.use).to.have.been.calledWith('/', grpcGatewayStub([`/${protoPath}`], rpcAddress))
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
        }
      }
      pubKey = 'pubkey'
      privKey = 'privkey'
      readFileSyncStub.withArgs(options.privKeyPath).returns(privKey)
      readFileSyncStub.withArgs(options.pubKeyPath).returns(pubKey)
      protoPath = '/path/to/proto'
      rpcAddress = 'my-daemon-rpc-address:8080'
      expressStub = { use: sinon.stub() }
      bodyParserStub = { json: sinon.stub(), urlencoded: sinon.stub() }
      grpcGatewayStub = sinon.stub().withArgs([`/${protoPath}`], rpcAddress)
      express = sinon.stub().returns(expressStub)

      createHttpServer.__set__('express', express)
      createHttpServer.__set__('bodyParser', bodyParserStub)
      createHttpServer.__set__('grpcGateway', grpcGatewayStub)
      createHttpServer.__set__('grpc', {
        credentials: {
          createSsl: sinon.stub().returns(channelCredentialStub)
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
      expect(expressStub.use).to.have.been.calledWith('/', grpcGatewayStub([`/${protoPath}`], rpcAddress, channelCredentialStub))
    })

    it('defaults a 0.0.0.0 address to localhost for certificate normalization', () => {
      createHttpServer(protoPath, '0.0.0.0:8080', options)
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, 'localhost:8080', sinon.match.any)
    })

    it('uses the rpc address specified in the daemon', () => {
      expect(grpcGatewayStub).to.have.been.calledWith(sinon.match.any, rpcAddress, sinon.match.any)
    })

    it('creates an https server', () => {
      expect(createServerStub).to.have.been.calledWith({ key: privKey, cert: pubKey }, expressStub)
    })

    it('returns an https app', () => {
      expect(createHttpServer(protoPath, rpcAddress, options)).to.eql(httpsApp)
    })
  })
})
