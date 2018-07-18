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
    let symbol

    const newDepositAddress = program.__get__('newDepositAddress')

    beforeEach(() => {
      symbol = 'BTC'
      args = { symbol }
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
      expect(addressStub).to.have.been.calledWith({ symbol })
    })
  })

  describe('balance', () => {
    let daemonStub
    let walletBalanceStub
    let rpcAddress
    let symbol
    let args
    let opts
    let logger
    let balances
    let ltcBalance
    let btcBalance
    let tableStub
    let tablePushStub

    const balance = program.__get__('balance')

    beforeEach(() => {
      symbol = 'BTC'
      args = { symbol }
      rpcAddress = 'test:1337'
      opts = { rpcAddress }
      logger = { info: sinon.stub(), error: sinon.stub() }
      btcBalance = { symbol, totalBalance: 10000, totalChannelBalance: 2000 }
      ltcBalance = { symbol: 'LTC', totalBalance: 200, totalChannelBalance: 200 }
      balances = [btcBalance, ltcBalance]

      walletBalanceStub = sinon.stub().returns({ balances })
      tablePushStub = sinon.stub()
      tableStub = sinon.stub()
      tableStub.prototype.push = tablePushStub
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { getBalances: walletBalanceStub }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('Table', tableStub)
    })

    beforeEach(async () => {
      await balance(args, opts, logger)
    })

    it('calls broker daemon for a wallet balance', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(walletBalanceStub).to.have.been.calledOnce()
    })

    it('adds a correct balance for BTC', () => {
      const expectedResult = ['BTC', '0.0000200000000000', '0.0000800000000000']
      const result = tablePushStub.args[0][0]

      // Since the text in the result contains colors (non-TTY) we have to use
      // an includes matcher instead of importing the color lib for testing.
      //
      // TODO: If this becomes an issue in the future, we can omit the code and cast
      //       a color on the string
      result.forEach((r, i) => {
        expect(r).to.include(expectedResult[i])
      })
    })

    it('adds a correct balance for LTC', () => {
      const expectedResult = ['LTC', '0.0000020000000000', '0.0000000000000000']
      const result = tablePushStub.args[1][0]

      // Since the text in the result contains colors (non-TTY) we have to use
      // an includes matcher instead of importing the color lib for testing.
      //
      // TODO: If this becomes an issue in the future, we can omit the code and cast
      //       a color on the string
      result.forEach((r, i) => {
        expect(r).to.include(expectedResult[i])
      })
    })

    it('adds balances to the cli table', () => {
      expect(tablePushStub).to.have.been.calledTwice()
    })
  })

  describe('commitBalance', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let symbol
    let walletBalanceStub
    let balances
    let daemonStub
    let commitBalanceStub
    let askQuestionStub

    const commitBalance = program.__get__('commitBalance')

    beforeEach(() => {
      symbol = 'BTC'
      args = { symbol }
      rpcAddress = 'test:1337'
      balances = [
        { symbol: 'BTC', totalBalance: 100, totalChannelBalance: 10 }
      ]
      walletBalanceStub = sinon.stub().returns({ balances })
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
    })

    beforeEach(async () => {
      await commitBalance(args, opts, logger)
    })

    it('gets a balance from the daemon', () => {
      expect(walletBalanceStub).to.have.been.called()
    })

    it('calls the daemon to commit a balance to the relayer', () => {
      const { totalBalance, totalChannelBalance } = balances[0]
      const uncommittedBalance = totalBalance - totalChannelBalance
      expect(commitBalanceStub).to.have.been.calledWith(sinon.match({ balance: uncommittedBalance.toString(), symbol }))
    })

    it('asks the user if they are ok to commit to a balance', () => {
      expect(askQuestionStub).to.have.been.called()
    })
  })
})
