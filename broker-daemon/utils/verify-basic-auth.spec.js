const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')
const { PublicError } = require('grpc-methods')

const verifyBasicAuth = rewire(path.resolve(__dirname, 'verify-basic-auth'))
const credentialGenerator = rewire(path.resolve(__dirname, '..', '..', 'broker-cli', 'utils', 'basic-auth'))

describe('verifyBasicAuth', () => {
  let logger
  let credentialsToBasicAuth
  let grpcAuthHandler

  beforeEach(() => {
    logger = {
      debug: sinon.stub()
    }

    credentialsToBasicAuth = credentialGenerator.__get__('credentialsToBasicAuth')
  })

  it('does not error if auth is disabled', () => {
    const disableAuth = true
    const rpcUser = 'sparkswap'
    const rpcPass = 'sparkswap'
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    grpcAuthHandler = verifyBasicAuth(rpcUser, rpcPass, disableAuth)
    const res = grpcAuthHandler({ metadata, logger })
    expect(res).to.be.undefined()
  })

  it('does not error if credentials are verified', () => {
    const rpcUser = 'sparkswap'
    const rpcPass = 'sparkswap'
    const disableAuth = true
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    grpcAuthHandler = verifyBasicAuth(rpcUser, rpcPass, disableAuth)
    const res = grpcAuthHandler({ metadata, logger })
    expect(res).to.be.undefined()
  })

  it('errors if username is incorrect', () => {
    const rpcUser = 'sparkswap'
    const rpcPass = 'sparkswap'
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    const badUser = 'sperkswap'
    grpcAuthHandler = verifyBasicAuth(badUser, rpcPass)
    return expect(() => grpcAuthHandler({ metadata, logger })).to.throw(PublicError)
  })

  it('errors if password is incorrect', () => {
    const rpcUser = 'sparkswap'
    const rpcPass = 'sparkswap'
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    const badPass = 'sperkswap'
    grpcAuthHandler = verifyBasicAuth(rpcUser, badPass)
    return expect(() => grpcAuthHandler({ metadata, logger })).to.throw(PublicError)
  })

  it('errors if username and password are incorrect', () => {
    const rpcUser = 'sparkswap'
    const rpcPass = 'sparkswap'
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    const badUser = 'sperkswap'
    const badPass = 'sperkswap'
    grpcAuthHandler = verifyBasicAuth(badUser, badPass)
    return expect(() => grpcAuthHandler({ metadata, logger })).to.throw(PublicError)
  })
})
