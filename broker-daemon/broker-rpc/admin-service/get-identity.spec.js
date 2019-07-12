const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const getIdentity = rewire(path.resolve(__dirname, 'get-identity'))

describe('get-identity', () => {
  describe('getIdentity', () => {
    let relayerStub
    let pubKey
    let loggerStub
    let result

    beforeEach(() => {
      pubKey = 'fakekey'
      relayerStub = {
        identity: {
          pubKey
        }
      }
      loggerStub = {
        info: sinon.stub(),
        debug: sinon.stub()
      }
    })

    beforeEach(async () => {
      result = await getIdentity({ relayer: relayerStub, logger: loggerStub })
    })

    it('returns the public key', async () => {
      expect(result).to.be.eql({ publicKey: pubKey })
    })
  })
})
