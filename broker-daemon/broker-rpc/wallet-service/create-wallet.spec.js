const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createWallet = rewire(path.resolve(__dirname, 'create-wallet'))

describe('create-wallet', () => {
  let logger
  let engines
  let CreateWalletResponse
  let engineStub
  let params
  let seeds

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub()
    }
    CreateWalletResponse = sinon.stub()
    seeds = ['my', 'seeds']
    engineStub = {
      createWallet: sinon.stub().resolves(seeds)
    }
    engines = new Map([['BTC', engineStub]])
    params = {
      symbol: 'BTC',
      password: 'mypassword'
    }
  })

  it('errors if we could not find a valid engine', async () => {
    params.symbol = 'LTC'
    expect(createWallet({ logger, params, engines }, { CreateWalletResponse })).to.eventually.be.rejectedWith('Unable to create wallet')
  })

  it('creates a wallet', async () => {
    await createWallet({ logger, params, engines }, { CreateWalletResponse })
    expect(engineStub.createWallet).to.have.been.calledWith(params.password)
  })

  it('returns a recovery seed', async () => {
    await createWallet({ logger, params, engines }, { CreateWalletResponse })
    expect(CreateWalletResponse).to.have.been.calledWith(sinon.match({ recoverySeed: seeds }))
  })
})
