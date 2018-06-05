const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'wallet')
const program = rewire(programPath)

describe('cli wallet', () => {
  describe('newDepositAddress', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let addressStub
    let daemonStub

    const newDepositAddress = program.__get__('newDepositAddress')

    beforeEach(() => {
      args = {}
      rpcAddress = 'test:1337'
      opts = { rpcAddress }
      logger = { info: sinon.stub(), error: sinon.stub() }

      addressStub = sinon.stub()
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { newDepositAddress: addressStub }

      program.__set__('BrokerDaemonClient', daemonStub)

      newDepositAddress(args, opts, logger)
    })

    it('calls broker daemon for a new deposit address', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(addressStub).to.have.been.calledOnce()
    })
  })

  describe('walletBalance', () => {
    let daemonStub
    let walletBalanceStub
    let rpcAddress
    let args
    let opts
    let logger

    const balance = program.__get__('balance')

    beforeEach(() => {
      args = {}
      rpcAddress = 'test:1337'
      opts = { rpcAddress }
      logger = { info: sinon.stub(), error: sinon.stub() }

      walletBalanceStub = sinon.stub()
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { walletBalance: walletBalanceStub }

      program.__set__('BrokerDaemonClient', daemonStub)

      balance(args, opts, logger)
    })

    it('calls broker daemon for a wallet balance', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(walletBalanceStub).to.have.been.calledOnce()
    })
  })
})
