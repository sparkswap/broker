const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')
const { PublicError } = require('grpc-methods')

const basicAuth = rewire(path.resolve(__dirname, 'basic-auth'))
const credentialGenerator = rewire(path.resolve(__dirname, '..', '..', 'broker-cli', 'utils', 'basic-auth'))

describe.only('basicAuth', () => {
  describe('verify', () => {
    let logger
    let credentialsToBasicAuth

    beforeEach(() => {
      logger = {
        debug: sinon.stub()
      }

      credentialsToBasicAuth = credentialGenerator.__get__('credentialsToBasicAuth')
    })

    it('does not error if auth is disabled', () => {
      const res = basicAuth.verify.call({disableAuth: true}, { metadata: {}, logger })
      expect(res).to.be.undefined()
    })

    it('does not error if credentials are verified', () => {
      const username = 'sparkswap'
      const password = 'sparkswap'
      const token = credentialsToBasicAuth(username, password)
      const metadata = { authorization: token }
      const context = {
        disableAuth: true,
        rpcUser: username,
        rpcPass: password
      }
      const res = basicAuth.verify.call(context, { metadata, logger })
      expect(res).to.be.undefined()
    })

    it('errors if username is incorrect', () => {
      const username = 'sparkswap'
      const password = 'sparkswap'
      const token = credentialsToBasicAuth(username, password)
      const metadata = { authorization: token }
      const context = {
        rpcUser: 'sperkswap',
        rpcPass: password
      }
      return expect(() => basicAuth.verify.call(context, { metadata, logger })).to.throw(PublicError)
    })

    it('errors if password is incorrect', () => {
      const username = 'sparkswap'
      const password = 'sparkswap'
      const token = credentialsToBasicAuth(username, password)
      const metadata = { authorization: token }
      const context = {
        rpcUser: username,
        rpcPass: 'persewerd'
      }
      return expect(() => basicAuth.verify.call(context, { metadata, logger })).to.throw(PublicError)
    })

    it('errors if username and password are incorrect', () => {
      const username = 'sparkswap'
      const password = 'sparkswap'
      const token = credentialsToBasicAuth(username, password)
      const metadata = { authorization: token }
      const context = {
        rpcUser: 'sperkswap',
        rpcPass: 'persewerd'
      }
      return expect(() => basicAuth.verify.call(context, { metadata, logger })).to.throw(PublicError)
    })
  })
})
