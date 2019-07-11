const path = require('path')
const {
  expect,
  rewire,
  sinon
} = require('test/test-helper')

const recoverWallet = rewire(path.resolve(__dirname, 'recover-wallet'))

describe('recover-wallet', () => {
  let logger
  let params
  let engines
  let EmptyResponse
  let engine

  beforeEach(() => {
    EmptyResponse = sinon.stub()
    engine = {
      recoverWallet: sinon.stub()
    }
    logger = {
      error: sinon.stub()
    }
    params = {
      symbol: 'BTC',
      password: 'SPARKSWAP',
      seed: ['my', 'test', 'seed'],
      useBackupFile: true
    }
    engines = new Map([['BTC', engine]])
  })

  it('errors if password is missing', () => {
    params.password = null
    return expect(recoverWallet({ logger, engines, params }, { EmptyResponse })).to.eventually.be.rejectedWith('Password is required')
  })

  it('errors if seed is missing', () => {
    params.seed = null
    return expect(recoverWallet({ logger, engines, params }, { EmptyResponse })).to.eventually.be.rejectedWith('seed is required')
  })

  it('throws an error for an invalid engine type', () => {
    const badParams = { symbol: 'BAD' }
    return expect(recoverWallet({ logger, engines, params: badParams }, { EmptyResponse })).to.eventually.be.rejectedWith('Unable to recover wallet')
  })

  it('recovers a wallet', async () => {
    await recoverWallet({ logger, engines, params }, { EmptyResponse })
    expect(engine.recoverWallet).to.have.been.calledWith(params.password, params.seed, params.useBackupFile)
  })
})
