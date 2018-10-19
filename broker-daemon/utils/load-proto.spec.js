const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const loadProtoPath = path.resolve(__dirname, 'load-proto')
const loadProto = rewire(loadProtoPath)

describe('loadGrpcProto', () => {
  let fs
  let protoPath
  let loadStub
  let loadSyncStub
  let definition

  let revertFs
  let revertGrpc
  let revertGrpcLoader

  afterEach(() => {
    revertFs()
    revertGrpc()
    revertGrpcLoader()
  })

  beforeEach(() => {
    loadStub = sinon.stub()
    definition = sinon.stub()
    loadSyncStub = sinon.stub().returns(definition)
    protoPath = 'broker.proto'
    fs = { existsSync: () => protoPath }

    revertFs = loadProto.__set__('fs', fs)
    revertGrpc = loadProto.__set__('grpc', { loadPackageDefinition: loadStub })
    revertGrpcLoader = loadProto.__set__('protoLoader', { loadSync: loadSyncStub })
  })

  it('calls an fs to get public key info', () => {
    const options = loadProto.__get__('PROTO_OPTIONS')
    loadProto(protoPath)

    expect(loadSyncStub).to.have.been.calledWith(protoPath, options)
    expect(loadStub).to.have.been.calledWith(definition)
  })

  describe('fs failure', () => {
    beforeEach(() => {
      fs = { existsSync: () => false }
      revertFs = loadProto.__set__('fs', fs)
    })

    it('throws a key not found error if the fs  call fails', () => {
      expect(() => loadProto(protoPath)).to.throw()
    })
  })
})
