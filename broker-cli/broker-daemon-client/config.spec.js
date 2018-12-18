const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const config = rewire(path.resolve(__dirname, 'config'))

describe('config', () => {
  describe('loadConfig', () => {
    let resolveStub
    let requireStub
    let loadConfig
    let warnStub

    beforeEach(() => {
      resolveStub = sinon.stub()
      requireStub = sinon.stub()
      warnStub = sinon.stub()

      config.__set__('path', { resolve: resolveStub })
      config.__set__('require', requireStub)
      config.__set__('console', {
        warn: warnStub
      })

      loadConfig = config.__get__('loadConfig')
    })

    it('resolves a path to a users sparkswap configuration file', () => {
      loadConfig()
      expect(resolveStub).to.be.calledWith(sinon.match.any, '.sparkswap/config.js')
    })

    it('loads a config file', () => {
      loadConfig()
      expect(requireStub).to.be.called()
    })

    it('sends a warning if a file is in the incorrect format', () => {
      requireStub.throws(new Error('Incorrect file'))
      loadConfig()
      expect(warnStub).to.have.been.called()
    })

    it('suppresses a warning if a file is not available', () => {
      requireStub.throws(new Error('Cannot find module'))
      loadConfig()
      expect(warnStub).to.not.have.been.called()
    })

    it('returns default configuration if a config file does not exist', () => {
      requireStub.throws(new Error('Incorrect file'))
      const res = loadConfig()
      expect(res).to.have.property('rpcAddress')
    })

    it('returns user configuration if a config file exists', () => {
      const rpcAddress = 'my.rpc.address:27492'
      requireStub.returns({ rpcAddress })
      const res = loadConfig()
      expect(res).to.have.property('rpcAddress', rpcAddress)
    })
  })
})
