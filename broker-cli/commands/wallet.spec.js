const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const program = rewire(path.resolve(__dirname, 'wallet'))

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

  describe('networkAddress', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let networkAddressStub
    let daemonStub
    let symbol

    const networkAddress = program.__get__('networkAddress')

    beforeEach(() => {
      symbol = 'BTC'
      args = { symbol }
      rpcAddress = 'test:1337'
      opts = { rpcAddress }
      logger = { info: sinon.stub(), error: sinon.stub() }

      networkAddressStub = sinon.stub()
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { getPaymentChannelNetworkAddress: networkAddressStub }

      program.__set__('BrokerDaemonClient', daemonStub)

      networkAddress(args, opts, logger)
    })

    it('calls broker daemon for the pub key', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(networkAddressStub).to.have.been.calledWith({ symbol })
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
      btcBalance = { symbol, uncommittedBalance: 10000, totalChannelBalance: 2000, totalPendingChannelBalance: 1000, uncommittedPendingBalance: 3000 }
      ltcBalance = { symbol: 'LTC', uncommittedBalance: 200, totalChannelBalance: 200, totalPendingChannelBalance: 500, uncommittedPendingBalance: 100 }
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
      const expectedResult = ['BTC', '0.0000200000000000', '0.000100000000000']
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
      const expectedResult = ['LTC', '0.0000020000000000', '0.0000020000000000']
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

  describe('networkStatus', () => {
    let daemonStub
    let getTradingCapacitiesStub
    let rpcAddress
    let opts
    let logger
    let tableStub
    let tablePushStub
    let market
    let baseSymbolCapacities
    let counterSymbolCapacities

    const networkStatus = program.__get__('networkStatus')
    const formatBalance = program.__get__('formatBalance')

    beforeEach(() => {
      market = 'BTC/LTC'
      rpcAddress = 'test:1337'
      opts = { rpcAddress, market }
      logger = { info: sinon.stub(), error: sinon.stub() }
      baseSymbolCapacities = {
        symbol: 'BTC',
        activeReceiveCapacity: '0.00001',
        activeSendCapacity: '0.000001',
        inactiveReceiveCapacity: '0.00002',
        inactiveSendCapacity: '0.000002',
        pendingReceiveCapacity: '0.00001',
        pendingSendCapacity: '0.000005'
      }
      counterSymbolCapacities = {
        symbol: 'LTC',
        activeReceiveCapacity: '0.00006',
        activeSendCapacity: '0.000001',
        inactiveReceiveCapacity: '0.00002',
        inactiveSendCapacity: '0.000002',
        pendingReceiveCapacity: '0.00001',
        pendingSendCapacity: '0.000005'
      }

      getTradingCapacitiesStub = sinon.stub().returns({baseSymbolCapacities, counterSymbolCapacities})
      tableStub = sinon.stub()
      tablePushStub = sinon.stub()
      tableStub.prototype.push = tablePushStub
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { getTradingCapacities: getTradingCapacitiesStub }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('Table', tableStub)
    })

    beforeEach(async () => {
      await networkStatus({}, opts, logger)
    })

    it('calls broker daemon for the network status', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(getTradingCapacitiesStub).to.have.been.calledOnce()
    })

    it('adds active header', () => {
      const expectedResult = ['Active', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds a correct active capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance('0.00001', 'active'), formatBalance('0.000001', 'active')]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds a correct active capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance('0.000001', 'active'), formatBalance('0.00006', 'active')]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds pending header', () => {
      const expectedResult = ['Pending', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct pending capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance('0.00001', 'pending'), formatBalance('0.000005', 'pending')]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct pending capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance('0.000005', 'pending'), formatBalance('0.00001', 'pending')]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds inactive header', () => {
      const expectedResult = ['Inactive', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct inactive capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance('0.00002', 'inactive'), formatBalance('0.000002', 'inactive')]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct inactive capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance('0.000002', 'inactive'), formatBalance('0.00002', 'inactive')]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })
  })

  describe('formatBalance', () => {
    const formatBalance = program.__get__('formatBalance')

    it('does not color the balance if the balance is 0', () => {
      expect(formatBalance('0', 'active')).to.eql('0.0000000000000000')
    })

    it('colors the balance green if the balance is greater than 0 and the status is active', () => {
      expect(formatBalance('0.0002', 'active')).to.eql('0.0002000000000000'.green)
    })

    it('colors the balance yellow if the balance is greater than 0 and the status is pending', () => {
      expect(formatBalance('0.00003', 'pending')).to.eql('0.0000300000000000'.yellow)
    })

    it('colors the balance red if the balance is greater than 0 and the status is inactive', () => {
      expect(formatBalance('0.004', 'inactive')).to.eql('0.0040000000000000'.red)
    })
  })

  describe('commit', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let symbol
    let walletBalanceStub
    let balances
    let daemonStub
    let commitStub
    let askQuestionStub
    let amount
    let market
    let errorStub

    const commit = program.__get__('commit')

    beforeEach(() => {
      errorStub = sinon.stub()
      symbol = 'BTC'
      market = 'BTC/LTC'
      amount = null
      args = { symbol, amount }
      rpcAddress = 'test:1337'
      balances = [
        { symbol: 'BTC', uncommittedBalance: 16777000, totalChannelBalance: 100 }
      ]
      walletBalanceStub = sinon.stub().returns({ balances })
      commitStub = sinon.stub()
      askQuestionStub = sinon.stub().returns('Y')
      opts = { rpcAddress, market }
      logger = {
        info: sinon.stub(),
        error: errorStub
      }

      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = {
        getBalances: walletBalanceStub,
        commit: commitStub
      }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('askQuestion', askQuestionStub)
    })

    it('gets a balance from the daemon', async () => {
      await commit(args, opts, logger)
      expect(walletBalanceStub).to.have.been.called()
    })

    it('calls the daemon to commit a balance to the relayer', async () => {
      await commit(args, opts, logger)
      const { uncommittedBalance } = balances[0]
      expect(commitStub).to.have.been.calledWith({ balance: uncommittedBalance.toString(), symbol, market })
    })

    it('asks the user if they are ok to commit to a balance', async () => {
      await commit(args, opts, logger)
      expect(askQuestionStub).to.have.been.called()
    })

    it('logs an error if currency is not supported', async () => {
      await commit(args, opts, logger)
      const badSymbol = 'bad'
      await commit({ symbol: badSymbol }, opts, logger)
      const expectedError = sinon.match.instanceOf(Error)
        .and(sinon.match.has('message', `Currency is not supported by the CLI: ${badSymbol}`))
      expect(errorStub).to.have.been.calledWith(sinon.match(expectedError))
    })

    it('defaults a specified amount to uncommitted balance', async () => {
      const { uncommittedBalance } = balances[0]
      args.amount = '1234'
      await commit(args, opts, logger)
      expect(commitStub).to.have.been.calledWith(sinon.match({ balance: uncommittedBalance.toString() }))
    })
  })

  describe('release', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let market
    let daemonStub
    let releaseStub
    let askQuestionStub

    const release = program.__get__('release')

    beforeEach(() => {
      rpcAddress = 'test:1337'
      market = 'BTC/LTC'
      opts = { rpcAddress, market }
      releaseStub = sinon.stub().resolves({})
      askQuestionStub = sinon.stub().returns('Y')
      logger = { info: sinon.stub(), error: sinon.stub() }

      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = {
        releaseChannels: releaseStub
      }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('askQuestion', askQuestionStub)
    })

    it('calls the daemon to release channels in the given market', async () => {
      await release(args, opts, logger)
      expect(releaseStub).to.have.been.calledWith({market})
    })

    it('asks the user if they are ok to release channels', async () => {
      await release(args, opts, logger)
      expect(askQuestionStub).to.have.been.called()
    })

    it('returns early if the user does not agree to release channels', async () => {
      askQuestionStub.returns('N')
      await release(args, opts, logger)
      expect(releaseStub).to.not.have.been.called()
    })

    it('logs the number of channels closed', async () => {
      await release(args, opts, logger)
      expect(logger.info).to.have.been.called()
    })
  })

  describe('withdraw', () => {
    let args
    let opts
    let logger
    let rpcAddress
    let address
    let daemonStub
    let withdrawStub
    let askQuestionStub
    let symbol
    let amount
    let txid

    const withdraw = program.__get__('withdraw')

    beforeEach(() => {
      symbol = 'BTC'
      rpcAddress = 'test:1337'
      amount = 2
      address = 'asdfasdf'
      args = { symbol, amount, address }
      opts = { rpcAddress }
      txid = '1234'
      withdrawStub = sinon.stub().resolves({txid: '1234'})
      askQuestionStub = sinon.stub().returns('Y')
      logger = { info: sinon.stub(), error: sinon.stub() }

      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = {
        withdrawFunds: withdrawStub
      }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('askQuestion', askQuestionStub)
    })

    it('calls the daemon to withdraw channels in the given market', async () => {
      await withdraw(args, opts, logger)
      expect(withdrawStub).to.have.been.calledWith({amount, symbol, address})
    })

    it('asks the user if they are ok to withdraw channels', async () => {
      await withdraw(args, opts, logger)
      expect(askQuestionStub).to.have.been.called()
    })

    it('returns early if the user does not agree to withdraw channels', async () => {
      askQuestionStub.returns('N')
      await withdraw(args, opts, logger)
      expect(withdrawStub).to.not.have.been.called()
    })

    it('logs a successful withdrawal of funds', async () => {
      await withdraw(args, opts, logger)
      expect(logger.info).to.have.been.calledWith(`Successfully withdrew ${amount} ${symbol} from your wallet!`, { id: txid })
    })
  })
})
