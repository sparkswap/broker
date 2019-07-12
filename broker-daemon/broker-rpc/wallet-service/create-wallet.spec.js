const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createWallet = rewire(path.resolve(__dirname, 'create-wallet'))

describe('create-wallet', () => {
  let logger
  let engines
  let engineStub
  let params
  let seeds

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub()
    }
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

    params.symbol = 'LTC'
    expect(createWallet({ logger, params, engines })).to.eventually.be.rejectedWith('Unable to create wallet')
  })

  it('creates a wallet', async () => {
    await createWallet({ logger, params, engines })
    expect(engineStub.createWallet).to.have.been.calledWith(params.password)
  })

  it('returns a recovery seed', async () => {
    expect(await createWallet({ logger, params, engines })).to.be.eql({ recoverySeed: seeds })
  })
})
