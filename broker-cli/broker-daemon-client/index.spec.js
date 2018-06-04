const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const BrokerDaemonClient = rewire(path.resolve(__dirname))

describe('BrokerDaemonClient', () => {
  let broker
  let rpcAddress
  let loadStub
  let createInsecureCredsStub

  beforeEach(() => {
    rpcAddress = null
    createInsecureCredsStub = sinon.stub()
    loadStub = sinon.stub().returns({
      AdminService: sinon.stub(),
      OrderService: sinon.stub(),
      OrderBookService: sinon.stub(),
      WalletService: sinon.stub()
    })

    BrokerDaemonClient.__set__('grpc', {
      load: loadStub,
      credentials: {
        createInsecure: createInsecureCredsStub
      }
    })

    broker = new BrokerDaemonClient(rpcAddress)
  })
})
