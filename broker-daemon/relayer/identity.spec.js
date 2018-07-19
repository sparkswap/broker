const path = require('path')
const crypto = require('crypto')
const { sinon, rewire, expect } = require('test/test-helper')

const Identity = rewire(path.resolve(__dirname, 'identity'))

describe('Identity', () => {
  let readFileSync
  let privKeyPath
  let pubKeyPath

  beforeEach(() => {
    readFileSync = sinon.stub()
    privKeyPath = '/path/to/priv'
    pubKeyPath = '/path/to/pub'

    Identity.__set__('readFileSync', readFileSync)
  })

  describe('#constructor', () => {
    let identity

    beforeEach(() => {
      identity = new Identity(privKeyPath, pubKeyPath)
    })

    it('assigns the priv key path', () => {
      expect(identity).to.have.property('privKeyPath', privKeyPath)
    })

    it('assigns the pub key path', () => {
      expect(identity).to.have.property('pubKeyPath', pubKeyPath)
    })
  })

  describe('#loadSync', () => {
    let identity
    let fakePrivKey = 'private'
    let fakePubKey = 'public'

    beforeEach(() => {
      readFileSync.withArgs(privKeyPath).returns(fakePrivKey)
      readFileSync.withArgs(pubKeyPath).returns(fakePubKey)

      identity = new Identity(privKeyPath, pubKeyPath)
      identity.loadSync()
    })

    it('loads the private key from disk', () => {
      expect(readFileSync).to.have.been.calledWith(privKeyPath)
      expect(identity).to.have.property('privKey', fakePrivKey)
    })

    it('loads the public key from disk', () => {
      expect(readFileSync).to.have.been.calledWith(pubKeyPath)
      expect(identity).to.have.property('pubKey', fakePubKey)
    })
  })

  describe('#sign', () => {
    let identity
    let privKey
    let pubKey
    let data

    beforeEach(() => {
      identity = new Identity()
      privKey = '-----BEGIN EC PARAMETERS-----' + '\n' +
                'BggqhkjOPQMBBw==' + '\n' +
                '-----END EC PARAMETERS-----' + '\n' +
                '-----BEGIN EC PRIVATE KEY-----' + '\n' +
                'MHcCAQEEIFtvZnDK9mgU3HugwAAFfWyO3Vk4mcWIi1XEHl6g2ec5oAoGCCqGSM49' + '\n' +
                'AwEHoUQDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2GR5j8B19bxx7Th3/zmm7mZ8l' + '\n' +
                'NyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==' + '\n' +
                '-----END EC PRIVATE KEY-----' + '\n'
      pubKey = '-----BEGIN PUBLIC KEY-----' + '\n' +
               'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2' + '\n' +
               'GR5j8B19bxx7Th3/zmm7mZ8lNyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==' + '\n' +
               '-----END PUBLIC KEY-----' + '\n'
      identity.privKey = privKey
      data = 'MEYCIQDrfR7C9dqPELf0JvYGmw9S6bcEw/VBFtZzs2X3P7y7lQIhAKjCwcGTVwv1bDeya2NAbIihDTtggN18XaM7yhFZdrf1'
    })

    it('throws if there is no privKey', () => {
      identity.privKey = undefined

      expect(() => identity.sign(data)).to.throw('Cannot create a signature without a private key.')
    })

    it('creates a signature from a string', () => {
      const signature = identity.sign(data)
      expect(signature).to.be.a('string')

      const verify = crypto.createVerify('sha256')
      verify.update(Buffer.from(data, 'base64'))
      expect(verify.verify(pubKey, signature, 'base64')).to.be.eql(true)
    })
  })

  describe('.load', () => {
    it('creates a new identity instance', () => {
      const identity = Identity.load(privKeyPath, pubKeyPath)
      expect(identity).to.be.instanceOf(Identity)
      expect(identity.privKeyPath).to.be.eql(privKeyPath)
      expect(identity.pubKeyPath).to.be.eql(pubKeyPath)
    })

    it('loads the identity from disk', () => {
      Identity.prototype.loadSync = sinon.stub()
      Identity.load(privKeyPath, pubKeyPath)
      expect(Identity.prototype.loadSync).to.have.been.calledOnce()
    })
  })
})
