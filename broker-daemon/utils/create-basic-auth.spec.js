const path = require('path')
const { expect, sinon, rewire } = require('test/test-helper')

const createBasicAuth = rewire(path.resolve(__dirname, 'create-basic-auth'))
const credentialGenerator = rewire(path.resolve(__dirname, '..', '..', 'broker-cli', 'utils', 'basic-auth'))

describe('createBasicAuth', () => {
  let logger
  let credentialsToBasicAuth
  let grpcAuthHandler
  let rpcUser
  let rpcPass

  beforeEach(() => {
    logger = {
      debug: sinon.stub()
    }

    rpcUser = 'sparkswap'
    rpcPass = 'sparkswap'

    credentialsToBasicAuth = credentialGenerator.__get__('credentialsToBasicAuth')
  })

  it('errors if auth is enabled and there are no credentials', () => {
    expect(() => {
      createBasicAuth(null, null, false)
    }).to.throw('rpcUser and rpcPass are required if auth is enabled')
  })

  it('does not error if auth is disabled', async () => {
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    grpcAuthHandler = createBasicAuth(null, null, true)
    const res = await grpcAuthHandler({ metadata, logger })
    expect(res).to.be.undefined()
  })

  it('errors if no authorization token is available', () => {
    const metadata = {}
    grpcAuthHandler = createBasicAuth(rpcUser, rpcPass)
    return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(Error)
  })

  it('does not error if credentials are verified', async () => {
    const disableAuth = true
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    grpcAuthHandler = createBasicAuth(rpcUser, rpcPass, disableAuth)
    const res = await grpcAuthHandler({ metadata, logger })
    expect(res).to.be.undefined()
  })

  it('errors if username is incorrect', () => {
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    const badUser = 'sperkswap'
    grpcAuthHandler = createBasicAuth(badUser, rpcPass)
    return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(Error)
  })

  it('errors if password is incorrect', () => {
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    const badPass = 'sperkswap'
    grpcAuthHandler = createBasicAuth(rpcUser, badPass)
    return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(Error)
  })

  it('errors if username and password are incorrect', () => {
    const token = credentialsToBasicAuth(rpcUser, rpcPass)
    const metadata = { authorization: token }
    const badUser = 'sperkswap'
    const badPass = 'sperkswap'
    grpcAuthHandler = createBasicAuth(badUser, badPass)
    return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(Error)
  })
})
