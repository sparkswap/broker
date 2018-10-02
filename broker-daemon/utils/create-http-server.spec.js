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

  beforeEach(() => {
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

  it('creates a new express app', () => {
    createHttpServer(protoPath, rpcAddress)

    expect(express).to.have.been.calledOnce()
  })

  it('sets the app to parse JSON payloads', () => {
    createHttpServer(protoPath, rpcAddress)

    expect(expressStub.use).to.have.been.calledWith(bodyParserStub.json())
  })

  it('sets the app to parse urlencoded bodies', () => {
    createHttpServer(protoPath, rpcAddress)

    expect(expressStub.use).to.have.been.calledWith(bodyParserStub.urlencoded())
  })

  it('sets the app to use grpcGateway defined routing', () => {
    createHttpServer(protoPath, rpcAddress)

    expect(expressStub.use).to.have.been.calledWith('/', grpcGatewayStub([`/${protoPath}`], rpcAddress))
  })

  it('returns the configured app', () => {
    createHttpServer(protoPath, rpcAddress)

    expect(createHttpServer(protoPath, rpcAddress)).to.eql(expressStub)
  })
})
