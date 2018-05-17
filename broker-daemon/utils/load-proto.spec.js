const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const loadProtoPath = path.resolve(__dirname, 'load-proto')
const loadProto = rewire(loadProtoPath)

describe('loadGrpcProto', () => {
  let fs
  let protoPath
  let loadSpy

  let revertFs
  let revertGrpc

  afterEach(() => {
    revertFs()
    revertGrpc()
  })

  beforeEach(() => {
    loadSpy = sinon.spy()
    protoPath = 'relayer.proto'
    fs = { existsSync: () => protoPath }

    revertFs = loadProto.__set__('fs', fs)
    revertGrpc = loadProto.__set__('grpc', { load: loadSpy })
  })

  it('calls an fs to get public key info', () => {
    const fileType = loadProto.__get__('PROTO_FILE_TYPE')
    const options = loadProto.__get__('PROTO_OPTIONS')
    loadProto(protoPath)

    expect(loadSpy).to.have.been.calledWith(protoPath, fileType, options)
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
