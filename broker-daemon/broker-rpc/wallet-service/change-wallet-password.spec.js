const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const changeWalletPassword = rewire(path.resolve(__dirname, 'change-wallet-password'))

describe('change-wallet-password', () => {
  let symbol
  let currentPassword
  let newPassword
  let engines
  let engine
  let logger
  let EmptyResponse
  let params

  beforeEach(() => {
    currentPassword = 'current-password'
    newPassword = 'my-password'
    symbol = 'BTC'
    engine = {
      changeWalletPassword: sinon.stub(),
      isLocked: true
    }
    engines = new Map([
      ['BTC', engine]
    ])
    logger = {
      error: sinon.stub()
    }
    params = {
      symbol,
      currentPassword,
      newPassword
    }
    EmptyResponse = sinon.stub()
  })

  it('errors if engine could not be found', () => {
    params.symbol = 'LTC'
    return expect(changeWalletPassword({ logger, params, engines }, { EmptyResponse })).to.eventually.be.rejectedWith('Unable to change wallet password')
  })

  it('logs an error if engine could not be found', async () => {
    params.symbol = 'LTC'
    try {
      await changeWalletPassword({ logger, params, engines }, { EmptyResponse })
    } catch (e) {
      expect(logger.error).to.have.been.calledOnce()
    }
  })

  it('errors if the wallet is not locked', () => {
    engine.isLocked = false
    return expect(changeWalletPassword({ logger, params, engines }, { EmptyResponse })).to.eventually.be.rejectedWith('Unable to change your wallet password')
  })

  it('changes a wallet password for a specific engine', async () => {
    await changeWalletPassword({ logger, params, engines }, { EmptyResponse })
    expect(engine.changeWalletPassword).to.have.been.calledWith(currentPassword, newPassword)
  })

  it('returns an empty response', async () => {
    await changeWalletPassword({ logger, params, engines }, { EmptyResponse })
    expect(EmptyResponse).to.have.been.calledOnce()
  })
})
