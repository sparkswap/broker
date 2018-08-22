const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const basicAuth = rewire(path.resolve(__dirname, 'basic-auth'))

describe('basicAuth', () => {
  describe('#credentialsToBasicAuth', () => {
    let credentialsToBasicAuth
    let user
    let pass

    beforeEach(() => {
      user = 'sparkswap'
      pass = 'password'
      credentialsToBasicAuth = basicAuth.__get__('credentialsToBasicAuth')
    })

    it('generates a basic authentication header for a username and password', () => {
      const res = credentialsToBasicAuth(user, pass)
      // Format of the has is based off of RFC 7235
      // More info: https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
      const hash = Buffer.from(`${user}:${pass}`).toString('base64')
      const expectedResult = `Basic ${hash}`
      expect(res).to.be.eql(expectedResult)
    })
  })

  describe('#generateBasicAuthCredentials', () => {
    let MetaDataStub
    let basicAuthStub
    let generatorStub
    let generateBasicAuthCredentials
    let user
    let pass
    let res
    let credentials
    let metaSetStub

    beforeEach(() => {
      user = 'sparkswap'
      pass = 'password'
      credentials = 'credentials'
      generatorStub = sinon.stub().returns(credentials)
      basicAuthStub = sinon.stub()

      MetaDataStub = sinon.stub()
      metaSetStub = sinon.stub()
      MetaDataStub.prototype.set = metaSetStub

      basicAuth.__set__('grpc', {
        Metadata: MetaDataStub,
        credentials: {
          createFromMetadataGenerator: generatorStub
        }
      })
      basicAuth.__set__('credentialsToBasicAuth', basicAuthStub)

      generateBasicAuthCredentials = basicAuth.__get__('generateBasicAuthCredentials')
    })

    beforeEach(() => {
      res = generateBasicAuthCredentials(user, pass)
    })

    it('generates basic auth credentials from a username and password', () => {
      const callback = generatorStub.args[0][0]
      const callbackStub = sinon.stub()
      callback(null, callbackStub)
      expect(metaSetStub).to.have.been.calledWith('Authorization', sinon.match.any)
      expect(basicAuthStub).to.have.been.calledWith(user, pass)
      expect(callbackStub).to.have.been.calledWith(null, sinon.match(new MetaDataStub()))
    })

    it('generates grpc credentials', () => {
      expect(res).to.be.eql(credentials)
    })
  })
})
