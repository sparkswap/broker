const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const BrokerDaemonClient = rewire(path.resolve(__dirname))

describe('BrokerDaemonClient', () => {
  let broker
  let rpcAddress
  let loadStub
  let createInsecureCredsStub

  beforeEach(() => {
    rpcAddress = '127.0.0.1'
    createInsecureCredsStub = sinon.stub()
    loadStub = sinon.stub().returns({
      AdminService: sinon.stub(),
      OrderService: sinon.stub(),
      OrderBookService: sinon.stub(),
      WalletService: sinon.stub()
    })

    BrokerDaemonClient.__set__('loadProto', loadStub)
    BrokerDaemonClient.__set__('grpc', {
      credentials: {
        createInsecure: createInsecureCredsStub
      }
    })

    broker = new BrokerDaemonClient(rpcAddress)
  })

  describe('constructor', () => {
    xit('sets a protofile type of `proto`', () => {})
    xit('sets proto options', () => {})
    xit('loads proto file', () => {})
    xit('creates a broker', () => {})

    describe('rpc addresses', () => {
      xit('sets the broker daemon address to env variable', () => {
        const newAddress = 'new_address'
        // TODO: figure out how to stub env vars
        broker = new BrokerDaemonClient(null)
        expect(broker.address).to.contain(newAddress)
      })

      it('sets broker daemon address to the specified address', () => {
        const specifiedAddress = 'specified'
        broker = new BrokerDaemonClient(specifiedAddress)
        expect(broker.address).to.eql(specifiedAddress)
      })
    })

    describe('services', () => {
      xit('creates the admin service client')
      xit('creates the order service client')
      xit('creates the orderbook service client')
    })
  })

  describe('createOrder', () => {
    it('returns a promise from the broker', () => {})
  })

  describe('watchMarket', () => {
    it('returns a watchMarket stream from the broker', () => {})
  })
})
