const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'wallet')
const program = rewire(programPath)

describe('cli wallet', () => {
  describe('walletBalance', () => {
    let daemonStub
    let walletBalanceStub
    let rpcAddress

    const balance = program.__get__('walletBalance')

    beforeEach(() => {
      rpcAddress = 'test:1337'
      walletBalanceStub = sinon.stub()
      daemonStub = sinon.stub()
      daemonStub.prototype.walletBalance = walletBalanceStub
      program.__set__('BrokerDaemonClient', daemonStub)
    })

    it('calls broker daemon for a wallet balance', () => {
      balance(rpcAddress)
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(walletBalanceStub).to.have.been.calledOnce()
    })
  })
})
