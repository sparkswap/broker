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
      Admin: sinon.stub(),
      Order: sinon.stub(),
      OrderBook: sinon.stub(),
      Wallet: sinon.stub()
    })

    BrokerDaemonClient.__set__('grpc', {
      load: loadStub,
      credentials: {
        createInsecure: createInsecureCredsStub
      }
    })

    broker = new BrokerDaemonClient(rpcAddress)
  })

  describe('constructor', () => {
    it('defines a proto path', () => {
      expect(broker.protoPath).to.not.be.null()
      expect(broker.protoPath).to.not.be.undefined()
    })

    it('sets a protofile type of `proto`', () => {
      expect(broker.protoFileType).to.eql('proto')
    })

    it('sets proto options', () => {
      expect(broker.protoOptions).to.not.be.null()
      expect(broker.protoOptions).to.not.be.undefined()
    })

    it('loads proto file', () => {
      // need to mock grpc
      // then check if grpc.load receives the params from above
    })

    it('creates a broker', () => {})

    describe('rpc addresses', () => {
      const defaultAddress = 'localhost'

      it('sets a default address', () => {
        expect(broker.address).to.contain(defaultAddress)
      })

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
    it('returns a promise from the broker', () => {

    })
  })

  describe('watchMarket', () => {
    it('returns a watchMarket stream from the broker', () => {

    })
  })
})
