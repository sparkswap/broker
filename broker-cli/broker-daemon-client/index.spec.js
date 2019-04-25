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
  let combineCredentialsStub
  let generateAuthCredentialsStub
  let sslCredential
  let callCredential
  let adminServiceInstance
  let orderServiceInstance
  let orderBookServiceInstance
  let walletServiceInstance

  beforeEach(() => {
    address = '172.0.0.1:27492'
    certPath = 'my/cert/path.cert'
    certFile = 'mycertfile'
    sslCredential = 'sslcred'
    callCredential = 'callcred'

    credentialStub = sinon.stub()
    callerStub = {
      wrap: sinon.stub()
    }

    adminServiceInstance = { name: 'AdminService' }
    orderServiceInstance = { name: 'OrderService' }
    orderBookServiceInstance = { name: 'OrderBookService' }
    walletServiceInstance = { name: 'WalletService' }

    adminStub = sinon.stub().returns(adminServiceInstance)
    orderStub = sinon.stub().returns(orderServiceInstance)
    orderbookStub = sinon.stub().returns(orderBookServiceInstance)
    walletStub = sinon.stub().returns(walletServiceInstance)

    protoStub = sinon.stub().returns({
      broker: {
        rpc: {
          AdminService: adminStub,
          OrderService: orderStub,
          OrderBookService: orderbookStub,
          WalletService: walletStub
        }
      }
    })
    readFileSyncStub = sinon.stub().returns(certFile)
    createInsecureStub = sinon.stub().returns(credentialStub)
    createSslStub = sinon.stub().returns(sslCredential)
    joinStub = sinon.stub().returns(certPath)
    loadConfigStub = sinon.stub()
    consoleStub = { warn: sinon.stub() }
    combineCredentialsStub = sinon.stub()
    generateAuthCredentialsStub = sinon.stub().returns(callCredential)

    BrokerDaemonClient.__set__('loadConfig', loadConfigStub)
    BrokerDaemonClient.__set__('console', consoleStub)
    BrokerDaemonClient.__set__('loadProto', protoStub)
    BrokerDaemonClient.__set__('caller', callerStub)
    BrokerDaemonClient.__set__('readFileSync', readFileSyncStub)
    BrokerDaemonClient.__set__('path', { join: joinStub, sep: '/' })
    BrokerDaemonClient.__set__('basicAuth', {
      generateBasicAuthCredentials: generateAuthCredentialsStub
    })
    BrokerDaemonClient.__set__('grpc', {
      credentials: {
        createInsecure: createInsecureStub,
        combineChannelCredentials: combineCredentialsStub,
        createSsl: createSslStub
      }
    })
  })

  beforeEach(() => {
    loadConfigStub.returns({
      rpcAddress: address,
      rpcCertPath: certPath,
      disableAuth: true
    })
  })

  it('loads a proto file', () => {
    const protoPath = BrokerDaemonClient.__get__('PROTO_PATH')
    broker = new BrokerDaemonClient()
    expect(protoStub).to.have.been.calledWith(protoPath)
  })

  describe('authentication', () => {
    let broker
    let rpcUser
    let rpcPass
    let osStub
    let homedir

    beforeEach(() => {
      rpcUser = 'sparkswap'
      rpcPass = 'passwd'

      loadConfigStub.returns({
        rpcAddress: address,
        rpcCertPath: certPath,
        disableAuth: false,
        rpcUser,
        rpcPass
      })

      homedir = '/home'
      osStub = { homedir: sinon.stub().returns(homedir) }
      joinStub = sinon.stub().returns(certPath)
      BrokerDaemonClient.__set__('os', osStub)
    })

    it('reads a cert file', () => {
      broker = new BrokerDaemonClient()
      expect(readFileSyncStub).to.have.been.calledWith(certPath)
    })

    it('expands the filepath if it is pointing to home', () => {
      const newPath = `${homedir}/.sparkswap/config.js`
      joinStub = sinon.stub().returns(newPath)
      BrokerDaemonClient.__set__('path', { join: joinStub, sep: '/' })
      loadConfigStub.returns({
        rpcAddress: address,
        rpcCertPath: '~/.sparkswap/config.js',
        disableAuth: false,
        rpcUser,
        rpcPass
      })
      broker = new BrokerDaemonClient()
      expect(joinStub).to.have.been.calledWith(homedir, '.sparkswap', 'config.js')
      expect(osStub.homedir).to.have.been.called()
      expect(readFileSyncStub).to.have.been.calledWith(`${homedir}/.sparkswap/config.js`)
    })

    it('creates ssl credentials', () => {
      broker = new BrokerDaemonClient()
      expect(createSslStub).to.have.been.calledWith(certFile)
    })

    it('creates basic authorization credentials', () => {
      broker = new BrokerDaemonClient()
      expect(generateAuthCredentialsStub).to.have.been.calledWith(rpcUser, rpcPass)
    })

    it('adds credentials to the broker daemon client', () => {
      broker = new BrokerDaemonClient()
      expect(combineCredentialsStub).to.have.been.calledWith(sslCredential, callCredential)
    })

    context('auth is disabled', () => {
      it('creates insecure credentials', () => {
        loadConfigStub.returns({ rpcAddress: address, disableAuth: true })
        broker = new BrokerDaemonClient()
        expect(createInsecureStub).to.have.been.calledOnce()
        expect(broker.disableAuth).to.be.true()
      })
    })
  })

  describe('services', () => {
    let fakeInterceptor
    let revert

    beforeEach(() => {
      fakeInterceptor = sinon.stub()
      revert = BrokerDaemonClient.__set__('grpcDeadlineInterceptor', fakeInterceptor)
      broker = new BrokerDaemonClient()
    })

    afterEach(() => {
      revert()
    })

    it('creates an adminService', () => {
      expect(adminStub).to.have.been.calledWithExactly(broker.address, credentialStub)
      expect(callerStub.wrap).to.have.been.calledWithExactly(adminServiceInstance, {}, { interceptors: [fakeInterceptor] })
      expect(broker).to.have.property('adminService')
    })

    it('creates an orderService', () => {
      expect(orderStub).to.have.been.calledWithExactly(broker.address, credentialStub)
      expect(callerStub.wrap).to.have.been.calledWithExactly(orderServiceInstance, {}, { interceptors: [fakeInterceptor] })
      expect(broker).to.have.property('orderService')
    })

    it('creates an orderBookService', () => {
      const options = BrokerDaemonClient.__get__('GRPC_STREAM_OPTIONS')
      expect(orderbookStub).to.have.been.calledWithExactly(broker.address, credentialStub, options)
      expect(callerStub.wrap).to.have.been.calledWithExactly(orderBookServiceInstance, {}, { interceptors: [fakeInterceptor] })
      expect(broker).to.have.property('orderBookService')
    })

    it('creates an walletService', () => {
      expect(walletStub).to.have.been.calledWithExactly(broker.address, credentialStub)
      expect(callerStub.wrap).to.have.been.calledWithExactly(walletServiceInstance, {}, { interceptors: [fakeInterceptor] })
      expect(broker).to.have.property('walletService')
    })
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
