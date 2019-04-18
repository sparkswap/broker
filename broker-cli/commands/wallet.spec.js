const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const { Big } = require('../utils')

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
    let reserved
    let symbol
    let args
    let opts
    let logger
    let balances
    let ltcBalance
    let btcBalance
    let tableStub
    let tablePushStub
    let reverts = []

    const balance = program.__get__('balance')

    beforeEach(() => {
      symbol = 'BTC'
      args = { symbol }
      rpcAddress = 'test:1337'
      reserved = false
      opts = { rpcAddress, reserved }
      logger = { info: sinon.stub(), error: sinon.stub() }
      btcBalance = {
        symbol,
        error: '',
        uncommittedBalance: '0.0001000000000000',
        totalChannelBalance: '0.0000200000000000',
        totalPendingChannelBalance: '0.0000100000000000',
        uncommittedPendingBalance: '0.0000300000000000',
        totalReservedChannelBalance: '0.0000905000000000'
      }
      ltcBalance = {
        symbol: 'LTC',
        error: '',
        uncommittedBalance: '0.0000020000000000',
        totalChannelBalance: '0.0000020000000000',
        totalPendingChannelBalance: '0.0000050000000000',
        uncommittedPendingBalance: '0.0000010000000000',
        totalReservedChannelBalance: '0.0000000000000000'
      }
      balances = [btcBalance, ltcBalance]

      walletBalanceStub = sinon.stub().resolves({ balances })
      tablePushStub = sinon.stub()
      tableStub = sinon.stub()
      tableStub.prototype.push = tablePushStub
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { getBalances: walletBalanceStub }

      reverts.push(program.__set__('BrokerDaemonClient', daemonStub))
      reverts.push(program.__set__('Table', tableStub))
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('calls broker daemon for a wallet balance', async () => {
      await balance(args, opts, logger)
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(walletBalanceStub).to.have.been.calledOnce()
    })

    it('adds a correct balance for BTC', async () => {
      await balance(args, opts, logger)
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

    it('adds a correct balance for LTC', async () => {
      await balance(args, opts, logger)
      const expectedResult = ['LTC', '0.0000020000000000', '0.0000020000000000']
      const result = tablePushStub.args[1][0]

      // Since the text in the result contains colors (non-TTY) we have to use
      // an includes matcher instead of importing the color lib for testing.
      result.forEach((r, i) => {
        expect(r).to.include(expectedResult[i])
      })
    })

    it('adds correct reserved channel balance for BTC', async () => {
      reserved = true
      opts = { rpcAddress, reserved }
      await balance(args, opts, logger)
      const expectedResult = ['BTC', '0.0000200000000000', '0.000100000000000', '0.0000905000000000']

      const result = tablePushStub.args[0][0]

      // Since the text in the result contains colors (non-TTY) we have to use
      // an includes matcher instead of importing the color lib for testing.
      result.forEach((r, i) => {
        expect(r).to.include(expectedResult[i])
      })
    })

    it('adds correct reserved channel balance for LTC', async () => {
      reserved = true
      opts = { rpcAddress, reserved }
      await balance(args, opts, logger)
      const expectedResult = ['LTC', '0.0000020000000000', '0.0000020000000000', '0.0000000000000000']

      const result = tablePushStub.args[1][0]

      // Since the text in the result contains colors (non-TTY) we have to use
      // an includes matcher instead of importing the color lib for testing.
      result.forEach((r, i) => {
        expect(r).to.include(expectedResult[i])
      })
    })

    it('adds balances to the cli table', async () => {
      await balance(args, opts, logger)
      expect(tablePushStub).to.have.been.calledTwice()
    })

    it('throws an error for bad data', async () => {
      const badLtcBalance = {
        symbol: 'LTC',
        error: '',
        uncommittedBalance: '',
        totalChannelBalance: '',
        totalPendingChannelBalance: '',
        uncommittedPendingBalance: ''
      }
      balances = [badLtcBalance]
      walletBalanceStub.resolves({ balances })
      await balance(args, opts, logger)
      expect(logger.error).to.have.been.called()
    })

    context('an unavailable engine', () => {
      let emptyLtcBalance

      beforeEach(() => {
        emptyLtcBalance = {
          symbol: 'LTC',
          error: 'Something Happened',
          uncommittedBalance: '',
          totalChannelBalance: '',
          totalPendingChannelBalance: '',
          uncommittedPendingBalance: '',
          totalReservedChannelBalance: ''
        }
        balances = [btcBalance, emptyLtcBalance]

        walletBalanceStub.resolves({ balances })
      })

      beforeEach(async () => {
        await balance(args, opts, logger)
      })

      it('adds a `Not Available` placeholder', async () => {
        const expectedResult = ['LTC', 'Not Available', 'Not Available']
        const result = tablePushStub.args[1][0]

        // Since the text in the result contains colors (non-TTY) we have to use
        // an includes matcher instead of importing the color lib for testing.
        result.forEach((r, i) => {
          expect(r).to.include(expectedResult[i])
        })
        expect(tablePushStub).to.have.been.calledTwice()
      })
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
    let NETWORK_STATUSES
    let reverts = []

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
        pendingSendCapacity: '0.000005',
        availableReceiveCapacity: '0.00001',
        availableSendCapacity: '0.000001',
        outstandingReceiveCapacity: '0.00001',
        outstandingSendCapacity: '0.000001'
      }
      counterSymbolCapacities = {
        symbol: 'LTC',
        activeReceiveCapacity: '0.00006',
        activeSendCapacity: '0.000001',
        inactiveReceiveCapacity: '0.00002',
        inactiveSendCapacity: '0.000002',
        pendingReceiveCapacity: '0.00001',
        pendingSendCapacity: '0.000005',
        availableReceiveCapacity: '0.00001',
        availableSendCapacity: '0.000001',
        outstandingReceiveCapacity: '0.00001',
        outstandingSendCapacity: '0.000001'
      }

      getTradingCapacitiesStub = sinon.stub().resolves({ baseSymbolCapacities, counterSymbolCapacities })

      tableStub = sinon.stub()
      tablePushStub = sinon.stub()
      tableStub.prototype.push = tablePushStub
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = { getTradingCapacities: getTradingCapacitiesStub }

      reverts.push(program.__set__('BrokerDaemonClient', daemonStub))
      reverts.push(program.__set__('Table', tableStub))

      NETWORK_STATUSES = program.__get__('NETWORK_STATUSES')
    })

    beforeEach(async () => {
      await networkStatus({}, opts, logger)
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('calls broker daemon for the network status', () => {
      expect(daemonStub).to.have.been.calledWith(rpcAddress)
      expect(getTradingCapacitiesStub).to.have.been.calledOnce()
    })

    it('adds available header', () => {
      const expectedResult = ['Available', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds a correct available capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance(baseSymbolCapacities.availableReceiveCapacity, NETWORK_STATUSES.AVAILABLE), formatBalance(counterSymbolCapacities.availableSendCapacity, NETWORK_STATUSES.AVAILABLE)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds a correct available capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance(baseSymbolCapacities.availableSendCapacity, NETWORK_STATUSES.AVAILABLE), formatBalance(counterSymbolCapacities.availableReceiveCapacity, NETWORK_STATUSES.AVAILABLE)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds outstanding header', () => {
      const expectedResult = ['Outstanding', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds a correct outstanding capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance(baseSymbolCapacities.outstandingReceiveCapacity, NETWORK_STATUSES.OUTSTANDING), formatBalance(counterSymbolCapacities.outstandingSendCapacity, NETWORK_STATUSES.OUTSTANDING)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds a correct outstanding capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance(baseSymbolCapacities.outstandingSendCapacity, NETWORK_STATUSES.OUTSTANDING), formatBalance(counterSymbolCapacities.outstandingReceiveCapacity, NETWORK_STATUSES.OUTSTANDING)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds pending header', () => {
      const expectedResult = ['Pending', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct pending capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance('0.00001', NETWORK_STATUSES.PENDING), formatBalance('0.000005', NETWORK_STATUSES.PENDING)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct pending capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance('0.000005', NETWORK_STATUSES.PENDING), formatBalance('0.00001', NETWORK_STATUSES.PENDING)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds inactive header', () => {
      const expectedResult = ['Inactive', '', '']
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct inactive capacities for buying the base', () => {
      const expectedResult = ['  Buy BTC', formatBalance('0.00002', NETWORK_STATUSES.INACTIVE), formatBalance('0.000002', NETWORK_STATUSES.INACTIVE)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('adds correct inactive capacities for selling the base', () => {
      const expectedResult = ['  Sell BTC', formatBalance('0.000002', NETWORK_STATUSES.INACTIVE), formatBalance('0.00002', NETWORK_STATUSES.INACTIVE)]
      expect(tablePushStub).to.have.been.calledWith(expectedResult)
    })

    it('displays a message if there were errors in base capacities', async () => {
      const status = 'FAILED'
      const error = 'Something Happened'
      const badBaseCapacities = {
        symbol: baseSymbolCapacities.symbol,
        status,
        error
      }
      getTradingCapacitiesStub.resolves({ baseSymbolCapacities: badBaseCapacities, counterSymbolCapacities })

      await networkStatus({}, opts, logger)

      expect(logger.error).to.have.been.calledWith(sinon.match(`${badBaseCapacities.symbol}: Received errors`))
      expect(logger.error).to.have.been.calledWith(sinon.match(error))
    })

    it('displays a message if there were errors in counter capacities', async () => {
      const status = 'FAILED'
      const error = 'Something Happened'
      const badCounterCapacities = {
        symbol: counterSymbolCapacities.symbol,
        status,
        error
      }
      getTradingCapacitiesStub.resolves({ baseSymbolCapacities: badCounterCapacities, counterSymbolCapacities })

      await networkStatus({}, opts, logger)

      expect(logger.error).to.have.been.calledWith(sinon.match(`${badCounterCapacities.symbol}: Received errors`))
      expect(logger.error).to.have.been.calledWith(sinon.match(error))
    })
  })

  describe('formatBalance', () => {
    const NETWORK_STATUSES = program.__get__('NETWORK_STATUSES')
    const formatBalance = program.__get__('formatBalance')

    it('does not color the balance if the balance is 0', () => {
      expect(formatBalance('0', NETWORK_STATUSES.AVAILABLE)).to.eql('0.0000000000000000')
    })

    it('colors the balance green if the balance is greater than 0 and the status is active', () => {
      expect(formatBalance('0.0002', NETWORK_STATUSES.AVAILABLE)).to.eql('0.0002000000000000'.green)
    })

    it('colors the balance yellow if the balance is greater than 0 and the status is outstanding', () => {
      expect(formatBalance('0.00003', NETWORK_STATUSES.OUTSTANDING)).to.eql('0.0000300000000000'.yellow)
    })

    it('colors the balance yellow if the balance is greater than 0 and the status is pending', () => {
      expect(formatBalance('0.00003', NETWORK_STATUSES.PENDING)).to.eql('0.0000300000000000'.yellow)
    })

    it('colors the balance red if the balance is greater than 0 and the status is inactive', () => {
      expect(formatBalance('0.004', NETWORK_STATUSES.INACTIVE)).to.eql('0.0040000000000000'.red)
    })

    it('returns `Not Available` if balance is not provided', () => {
      expect(formatBalance(null, NETWORK_STATUSES.AVAILABLE)).to.eql('Not Available'.yellow)
    })

    it('returns `Not Available` if balance is blank', () => {
      expect(formatBalance('', NETWORK_STATUSES.AVAILABLE)).to.eql('Not Available'.yellow)
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
        { symbol: 'BTC', uncommittedBalance: '0.1677700000000000' }
      ]
      walletBalanceStub = sinon.stub().resolves({ balances })
      commitStub = sinon.stub()
      askQuestionStub = sinon.stub().resolves('Y')
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
      expect(commitStub).to.have.been.calledWith({ balance: Big(uncommittedBalance).toString(), symbol, market })
    })

    it('asks the user if they are ok to commit to a balance', async () => {
      await commit(args, opts, logger)
      expect(askQuestionStub).to.have.been.called()
    })

    it('logs an error if currency is not supported', async () => {
      const badSymbol = 'bad'
      const expectedError = sinon.match.instanceOf(Error)
        .and(sinon.match.has('message', `Currency is not supported by the CLI: ${badSymbol}`))

      await commit({ symbol: badSymbol }, opts, logger)

      expect(errorStub).to.have.been.calledWith(sinon.match(expectedError))
    })

    it('returns an error if the balances call for the currency returns an error', async () => {
      balances = [
        { symbol: 'BTC', uncommittedBalance: '', error: 'this is an error' }
      ]
      walletBalanceStub.resolves({ balances })
      const expectedError = sinon.match.instanceOf(Error)
        .and(sinon.match.has('message', `Error fetching current balances from ${symbol} engine`))

      await commit(args, opts, logger)

      expect(errorStub).to.have.been.calledWith(sinon.match(expectedError))
    })

    it('defaults a specified amount to uncommitted balance', async () => {
      const { uncommittedBalance } = balances[0]
      args.amount = '1234'
      await commit(args, opts, logger)
      expect(commitStub).to.have.been.calledWith(sinon.match({ balance: Big(uncommittedBalance).toString() }))
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
    let force

    const release = program.__get__('release')

    beforeEach(() => {
      rpcAddress = 'test:1337'
      market = 'BTC/LTC'
      force = false
      args = { market }
      opts = { rpcAddress, force }
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
      expect(releaseStub).to.have.been.calledWith({ market, force })
    })

    it('asks the user if they are ok to release channels', async () => {
      await release(args, opts, logger)
      expect(askQuestionStub).to.have.been.calledWith(sinon.match('Are you sure you want to release'))
    })

    it('returns early if the user does not agree to release channels', async () => {
      askQuestionStub.returns('N')
      await release(args, opts, logger)
      expect(releaseStub).to.not.have.been.called()
    })

    it('shows errors to the user if release channels returns them', async () => {
      const status = 'FAILED'
      const symbol = 'BTC'
      const error = 'Engine is locked'
      const base = {
        symbol,
        status,
        error: ''
      }
      const counter = {
        symbol,
        status,
        error
      }

      releaseStub.resolves({ base, counter })
      await release(args, opts, logger)
      expect(logger.info).to.have.been.calledWith(sinon.match(symbol))
      expect(logger.info).to.have.been.calledWith(sinon.match(status))
      expect(logger.info).to.have.been.calledWith(sinon.match(error))
    })

    it('displays an informative message to user on errors if channels can be force released', async () => {
      const status = 'FAILED'
      const symbol = 'BTC'
      const error = 'Inactive/pending channels exist. You must use `force` to close'
      const channel = { symbol, status, error }

      releaseStub.resolves({ base: channel, counter: channel })

      await release(args, opts, logger)
      expect(logger.info).to.have.been.calledWith(sinon.match('Use \'--force\''))
    })

    it('displays a disclaimer to the user on errors if channels can be force released', async () => {
      const status = 'FAILED'
      const symbol = 'BTC'
      const error = 'Inactive/pending channels exist. You must use `force` to close'
      const channel = { symbol, status, error }

      releaseStub.resolves({ base: channel, counter: channel })

      await release(args, opts, logger)
      expect(logger.info).to.have.been.calledWith(sinon.match('has the potential to lock your funds'))
    })

    context('force release of channels', () => {
      beforeEach(async () => {
        opts.force = true
        await release(args, opts, logger)
      })

      it('asks the user if they are ok to FORCE release some channels', async () => {
        expect(askQuestionStub).to.have.been.calledWith(sinon.match('Are you sure you want to FORCE the release'))
      })

      it('calls the daemon to force release channels in a given market', () => {
        expect(releaseStub).to.have.been.calledWith({ market, force: true })
      })
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
      withdrawStub = sinon.stub().resolves({ txid: '1234' })
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
      expect(withdrawStub).to.have.been.calledWith({ amount, symbol, address })
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

  describe('create', () => {
    let args
    let opts
    let logger
    let daemonStub
    let createWalletStub
    let seeds
    let errorStub
    let askQuestionStub
    let symbol
    let infoStub

    const create = program.__get__('create')

    beforeEach(() => {
      errorStub = sinon.stub()
      infoStub = sinon.stub()
      askQuestionStub = sinon.stub()
      symbol = 'BTC'
      args = {
        symbol
      }
      opts = {}
      logger = {
        info: infoStub,
        error: errorStub
      }
      seeds = ['my', 'seeds']

      createWalletStub = sinon.stub().returns({ recoverySeed: seeds })
      daemonStub = sinon.stub()
      daemonStub.prototype.walletService = {
        createWallet: createWalletStub
      }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('askQuestion', askQuestionStub)
    })

    it('logs an error if passwords do not match', async () => {
      askQuestionStub.onFirstCall().resolves('realpassword')
      askQuestionStub.onSecondCall().resolves('relpassword')
      await create(args, opts, logger)
      expect(errorStub).to.have.been.calledWith(sinon.match('Passwords did not match'))
    })

    it('creates a wallet', async () => {
      const password = 'password'
      askQuestionStub.resolves(password)
      await create(args, opts, logger)
      expect(createWalletStub).to.have.been.calledWith({ symbol, password })
    })

    it('outputs a cipher seed', async () => {
      const password = 'password'
      askQuestionStub.resolves(password)
      await create(args, opts, logger)
      expect(infoStub).to.have.been.calledWith(seeds)
    })
  })

  describe('unlock', () => {
    let args
    let opts
    let logger
    let daemonStub
    let errorStub
    let askQuestionStub
    let symbol
    let infoStub
    let unlockWalletStub

    const unlock = program.__get__('unlock')
    const password = 'my-password'

    beforeEach(() => {
      unlockWalletStub = sinon.stub()
      errorStub = sinon.stub()
      infoStub = sinon.stub()
      askQuestionStub = sinon.stub().resolves(password)
      daemonStub = sinon.stub().returns({
        walletService: {
          unlockWallet: unlockWalletStub
        }
      })
      symbol = 'BTC'
      args = {
        symbol
      }
      opts = {}
      logger = {
        info: infoStub,
        error: errorStub
      }

      program.__set__('BrokerDaemonClient', daemonStub)
      program.__set__('askQuestion', askQuestionStub)
    })

    beforeEach(async () => {
      await unlock(args, opts, logger)
    })

    it('create a broker daemon client', () => {
      expect(daemonStub).to.have.been.calledOnce()
    })

    it('asks the user for a wallet password', () => {
      expect(askQuestionStub).to.have.been.calledWith(sinon.match.string, sinon.match({ silent: true }))
    })

    it('calls unlock wallet', () => {
      expect(unlockWalletStub).to.have.been.calledWith(sinon.match({ symbol, password }))
    })
  })

  describe('history', () => {
    let args
    let opts
    let logger
    let daemonStub
    let symbol
    let walletServiceStub
    let transactions
    let revert

    const history = program.__get__('history')

    beforeEach(() => {
      transactions = [{
        type: 'mytype',
        amount: '10000',
        fees: '0.23442',
        timestamp: '1555369297619',
        transactionHash: 'transactionshash',
        blockHeight: '1337',
        pending: false
      }]
      walletServiceStub = {
        walletService: {
          walletHistory: sinon.stub().resolves({ transactions })
        }
      }
      daemonStub = sinon.stub().returns(walletServiceStub)
      symbol = 'BTC'
      args = {
        symbol
      }
      opts = {}
      logger = {
        info: sinon.stub(),
        error: sinon.stub()
      }

      revert = program.__set__('BrokerDaemonClient', daemonStub)
    })

    beforeEach(async () => {
      await history(args, opts, logger)
    })

    afterEach(() => {
      revert()
    })

    it('create a broker daemon client', () => {
      expect(daemonStub).to.have.been.calledOnce()
    })

    it('makes a call to walletHistory', () => {
      expect(walletServiceStub.walletService.walletHistory).to.have.been.calledWith({ symbol })
    })

    it('prints a table of transactions', () => {
      const table = logger.info.args[1][0]
      expect(table).to.include(transactions[0].type)
      expect(table).to.include(transactions[0].amount)
      expect(table).to.include(transactions[0].fees)
      expect(table).to.include(transactions[0].timestamp)
      expect(table).to.include(transactions[0].transactionHash)
      expect(table).to.include(transactions[0].blockHeight)
      expect(table).to.include(transactions[0].pending)
    })
  })
})
