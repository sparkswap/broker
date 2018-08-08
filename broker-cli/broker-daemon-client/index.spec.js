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

  beforeEach(() => {
    callerStub = sinon.stub()
    adminStub = sinon.stub()
    orderStub = sinon.stub()
    orderbookStub = sinon.stub()
    walletStub = sinon.stub()
    protoStub = sinon.stub().returns({
      AdminService: adminStub,
      OrderService: orderStub,
      OrderBookService: orderbookStub,
      WalletService: walletStub
    })

    BrokerDaemonClient.__set__('loadProto', protoStub)
    BrokerDaemonClient.__set__('caller', callerStub)
  })

  it('loads a proto file', () => {
    const protoPath = BrokerDaemonClient.__get__('PROTO_PATH')
    broker = new BrokerDaemonClient()
    expect(protoStub).to.have.been.calledWith(protoPath)
  })

  describe('services', () => {
    beforeEach(() => {
      broker = new BrokerDaemonClient()
    })

    it('creates an adminService', () => expect(callerStub).to.have.been.calledWith(broker.address, adminStub))
    it('creates an orderService', () => expect(callerStub).to.have.been.calledWith(broker.address, orderStub))
    it('creates an orderBookService', () => expect(callerStub).to.have.been.calledWith(broker.address, orderbookStub))
    it('creates an walletService', () => expect(callerStub).to.have.been.calledWith(broker.address, walletStub))
  })

  describe('address', () => {
    let address
    let loadConfigStub

    beforeEach(() => {
      address = '172.0.0.1'
      loadConfigStub = sinon.stub().returns({ rpcAddress: address })
    })

    it('defaults to CONFIG is address is not passed in', () => {
      BrokerDaemonClient.__set__('loadConfig', loadConfigStub)
      broker = new BrokerDaemonClient()
      expect(broker.address).to.eql(address)
    })

    it('uses a provided address', () => {
      const providedHost = '127.0.0.2:10009'
      broker = new BrokerDaemonClient(providedHost)
      expect(broker.address).to.eql(providedHost)
    })
  })
})
