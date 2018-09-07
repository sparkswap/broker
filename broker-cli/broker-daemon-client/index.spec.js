const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const BrokerDaemonClient = rewire(path.resolve(__dirname))

describe('BrokerDaemonClient', () => {
  let broker
  let protoStub
  let adminStub
  let orderStub
  let orderbookStub
  let walletStub
  let callerStub
  let readFileSyncStub
  let createInsecureStub
  let createSslStub
  let joinStub
  let loadConfigStub
  let address
  let consoleStub
  let certPath
  let certFile
  let credentialStub
  let infoStub

  beforeEach(() => {
    address = '172.0.0.1:27492'
    certPath = '/my/cert/path.cert'
    certFile = 'mycertfile'

    credentialStub = sinon.stub()
    callerStub = sinon.stub()
    adminStub = sinon.stub()
    orderStub = sinon.stub()
    orderbookStub = sinon.stub()
    walletStub = sinon.stub()
    infoStub = sinon.stub()

    protoStub = sinon.stub().returns({
      AdminService: adminStub,
      OrderService: orderStub,
      OrderBookService: orderbookStub,
      WalletService: walletStub,
      InfoService: infoStub
    })
    readFileSyncStub = sinon.stub().returns(certFile)
    createInsecureStub = sinon.stub().returns(true)
    createSslStub = sinon.stub().returns(credentialStub)
    joinStub = sinon.stub().returns(certPath)
    loadConfigStub = sinon.stub().returns({
      rpcAddress: address,
      rpcCertPath: certPath
    })
    consoleStub = { warn: sinon.stub() }

    BrokerDaemonClient.__set__('loadConfig', loadConfigStub)
    BrokerDaemonClient.__set__('console', consoleStub)
    BrokerDaemonClient.__set__('loadProto', protoStub)
    BrokerDaemonClient.__set__('caller', callerStub)
    BrokerDaemonClient.__set__('readFileSync', readFileSyncStub)
    BrokerDaemonClient.__set__('path', { join: joinStub })
    BrokerDaemonClient.__set__('grpc', {
      credentials: {
        createInsecure: createInsecureStub,
        createSsl: createSslStub
      }
    })
  })

  it('loads a proto file', () => {
    const protoPath = BrokerDaemonClient.__get__('PROTO_PATH')
    broker = new BrokerDaemonClient()
    expect(protoStub).to.have.been.calledWith(protoPath)
  })

  describe('ssl auth', () => {
    let broker

    it('creates insecure credentials if ssl is disabled', () => {
      loadConfigStub.returns({ rpcAddress: address, disableSsl: true })
      broker = new BrokerDaemonClient()
      expect(createInsecureStub).to.have.been.calledOnce()
      expect(broker.disableSsl).to.be.true()
    })

    it('reads a cert file', () => {
      broker = new BrokerDaemonClient()
      expect(readFileSyncStub).to.have.been.calledWith(certPath)
    })

    it('creates ssl credentials', () => {
      broker = new BrokerDaemonClient()
      expect(createSslStub).to.have.been.calledWith(certFile)
    })
  })

  describe('services', () => {
    beforeEach(() => {
      broker = new BrokerDaemonClient()
    })

    it('creates an adminService', () => expect(callerStub).to.have.been.calledWith(broker.address, adminStub, credentialStub))
    it('creates an orderService', () => expect(callerStub).to.have.been.calledWith(broker.address, orderStub, credentialStub))
    it('creates an orderBookService', () => expect(callerStub).to.have.been.calledWith(broker.address, orderbookStub, credentialStub))
    it('creates an walletService', () => expect(callerStub).to.have.been.calledWith(broker.address, walletStub, credentialStub))
    it('creates an infoService', () => expect(callerStub).to.have.been.calledWith(broker.address, infoStub, credentialStub))
  })

  describe('address', () => {
    it('defaults to CONFIG if an address is not passed in', () => {
      broker = new BrokerDaemonClient()
      expect(broker.address).to.eql(address)
    })

    it('defaults the port number if no port number is specified', () => {
      const providedHost = '127.1.1.5'
      const defaultPort = BrokerDaemonClient.__get__('DEFAULT_RPC_PORT')
      broker = new BrokerDaemonClient(providedHost)
      expect(broker.address).to.eql(`${providedHost}:${defaultPort}`)
    })

    it('uses a provided address', () => {
      const providedHost = '127.0.0.2:10009'
      broker = new BrokerDaemonClient(providedHost)
      expect(broker.address).to.eql(providedHost)
    })
  })
})
