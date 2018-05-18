const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const programPath = path.resolve('broker-cli', 'wallet')
const program = rewire(programPath)

describe('cli wallet', () => {
  describe('wallet', () => {
    let args
    let opts
    let logger
    let revert
    let balanceStub
    let responseStub
    let errorStub

    const wallet = program.__get__('wallet')

    beforeEach(() => {
      args = {}
      opts = {}
      errorStub = sinon.stub()
      responseStub = sinon.stub()
      logger = {
        info: responseStub,
        error: errorStub
      }
      balanceStub = sinon.stub()

      revert = program.__set__('walletBalance', balanceStub)
    })

    afterEach(() => {
      revert()
    })

    it('with command `balance` calls the correct function', async () => {
      const supportedCommands = program.__get__('SUPPORTED_COMMANDS')
      args.command = supportedCommands.BALANCE
      const expectedResponse = { balance: 100 }
      balanceStub.returns(expectedResponse)
      await wallet(args, opts, logger)
      expect(balanceStub).to.have.been.called()
      expect(responseStub).to.have.been.calledWith(`Total Balance: ${expectedResponse.balance}`)
    })

    it('logs an error if a command is not found', async () => {
      args.command = 'bad command'
      await wallet(args, opts, logger)
      expect(errorStub).to.have.been.calledWith('Error: Command not found')
    })

    it('logs an error if a command fails', async () => {
      args.command = 'balance'
      balanceStub.throws()
      await wallet(args, opts, logger)
      expect(errorStub).to.have.been.calledWith('Error: Error')
    })
  })

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
