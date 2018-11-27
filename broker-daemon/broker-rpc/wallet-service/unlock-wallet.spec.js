const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const unlockWallet = rewire(path.resolve(__dirname, 'unlock-wallet'))

describe('unlock-wallet', () => {
  let symbol
  let password
  let engines
  let engine
  let logger
  let EmptyResponse
  let params

  beforeEach(() => {
    password = 'my-password'
    symbol = 'BTC'
    engine = {
      unlockWallet: sinon.stub()
    }
    engines = new Map([
      ['BTC', engine]
    ])
    logger = {
      error: sinon.stub()
    }
    params = {
      symbol,
      password
    }
    EmptyResponse = sinon.stub()
  })

  it('errors if engine could not be found', () => {
    params.symbol = 'LTC'
    return expect(unlockWallet({ logger, params, engines }, { EmptyResponse })).to.eventually.be.rejectedWith('Unable to unlock wallet')
  })

  it('logs an error if engine could not be found', async () => {
    params.symbol = 'LTC'
    try {
      await unlockWallet({ logger, params, engines }, { EmptyResponse })
    } catch (e) {
      expect(logger.error).to.have.been.calledOnce()
    }
  })

  it('unlocks a wallet', async () => {
    await unlockWallet({ logger, params, engines }, { EmptyResponse })
    expect(engine.unlockWallet).to.have.been.calledWith(password)
  })

  it('returns an empty response', async () => {
    await unlockWallet({ logger, params, engines }, { EmptyResponse })
    expect(EmptyResponse).to.have.been.calledOnce()
  })
})
