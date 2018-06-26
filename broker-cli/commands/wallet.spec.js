const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve(__dirname, 'wallet')
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

  describe('balance', () => {
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
      daemonStub.prototype.walletService = { getBalances: walletBalanceStub }

      program.__set__('BrokerDaemonClient', daemonStub)

      balance(args, opts, logger)
    })

    it('calls broker daemon for a wallet balance', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(walletBalanceStub).to.have.been.calledOnce()
    })
  })

  describe('commitBalance', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let symbol
    let walletBalanceStub
    let totalBalance
    let committedBalance
    let daemonStub
    let commitBalanceStub
    let askQuestionStub

    const commitBalance = program.__get__('commitBalance')

    beforeEach(() => {
      symbol = 'BTC'
      args = { symbol }
      rpcAddress = 'test:1337'
      totalBalance = 10000
      committedBalance = 100
      walletBalanceStub = sinon.stub().returns({
        totalBalance: totalBalance,
        committedBalances: [{ symbol: 'BTC', value: committedBalance }]
      })
      commitBalanceStub = sinon.stub()
      askQuestionStub = sinon.stub().returns('Y')
      opts = { rpcAddress }
      logger = { info: sinon.stub(), error: sinon.stub() }

      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = {
        getBalances: walletBalanceStub,
        commitBalance: commitBalanceStub
      }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('askQuestion', askQuestionStub)
      program.__set__('DEFAULT_CURRENCY_SYMBOL', symbol)
    })

    beforeEach(async () => {
      await commitBalance(args, opts, logger)
    })

    it('gets a balance from the daemon', () => {
      expect(walletBalanceStub).to.have.been.called()
    })

    it('calls the daemon to commit a balance to the relayer', () => {
      const uncommittedBalance = totalBalance - committedBalance
      expect(commitBalanceStub).to.have.been.calledWith(sinon.match({ balance: uncommittedBalance.toString(), symbol }))
    })

    it('asks the user if they are ok to commit to a balance', () => {
      expect(askQuestionStub).to.have.been.called()
    })
  })
})
