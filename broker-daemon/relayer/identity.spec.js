const path = require('path')
const crypto = require('crypto')
const { sinon, rewire, expect, timekeeper } = require('test/test-helper')

const Identity = rewire(path.resolve(__dirname, 'identity'))

describe('Identity', () => {
  let readFileSync
  let Metadata
  let privKeyPath
  let pubKeyPath
  let randomBytes

  beforeEach(() => {
    readFileSync = sinon.stub()
    privKeyPath = '/path/to/priv'
    pubKeyPath = '/path/to/pub'

    Identity.__set__('readFileSync', readFileSync)

    Metadata = sinon.stub()
    Metadata.prototype.set = sinon.stub()
    Identity.__set__('Metadata', Metadata)

    randomBytes = sinon.stub()
    Identity.__set__('randomBytes', randomBytes)
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
    let fakePubKey = '-----BEGIN PUBLIC KEY-----' + '\n' +
                     'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2' + '\n' +
                     'GR5j8B19bxx7Th3/zmm7mZ8lNyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==' + '\n' +
                     '-----END PUBLIC KEY-----'

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

  describe('signing', () => {
    let identity
    let privKey
    let pubKey

    beforeEach(() => {
      identity = new Identity()
      privKey = '-----BEGIN EC PARAMETERS-----' + '\n' +
                'BggqhkjOPQMBBw==' + '\n' +
                '-----END EC PARAMETERS-----' + '\n' +
                '-----BEGIN EC PRIVATE KEY-----' + '\n' +
                'MHcCAQEEIFtvZnDK9mgU3HugwAAFfWyO3Vk4mcWIi1XEHl6g2ec5oAoGCCqGSM49' + '\n' +
                'AwEHoUQDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2GR5j8B19bxx7Th3/zmm7mZ8l' + '\n' +
                'NyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==' + '\n' +
                '-----END EC PRIVATE KEY-----'
      pubKey = '-----BEGIN PUBLIC KEY-----' + '\n' +
               'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2' + '\n' +
               'GR5j8B19bxx7Th3/zmm7mZ8lNyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==' + '\n' +
               '-----END PUBLIC KEY-----'
      identity.privKey = privKey
      identity.pubKey = pubKey
      identity.pubKeyBase64 = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2GR5j8B19bxx7Th3/zmm7mZ8lNyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A=='
    })

    describe('#sign', () => {
      let data

      beforeEach(() => {
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
        verify.update(data)
        expect(verify.verify(pubKey, signature, 'base64')).to.be.eql(true)
      })
    })

    describe('#identify', () => {
      let metadata

      beforeEach(() => {
        metadata = identity.identify()
      })

      afterEach(() => {
        timekeeper.reset()
      })

      it('creates metadata', () => {
        expect(metadata).to.be.instanceOf(Metadata)
      })

      it('adds the pub key to the metadata', () => {
        expect(Metadata.prototype.set).to.have.been.calledWith('pubkey', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2GR5j8B19bxx7Th3/zmm7mZ8lNyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==')
      })
    })

    describe('#authorize', () => {
      let id
      let auth
      let fakeRandom = Buffer.from('fake')
      let fakeSign = 'signature'
      let timestamp
      let timeInSeconds

      beforeEach(() => {
        id = 'someid'
        randomBytes.returns(fakeRandom)
        identity.sign = sinon.stub().returns(fakeSign)
        timestamp = 1532045654571
        timeInSeconds = 1532045655
        timekeeper.freeze(new Date(timestamp))

        auth = identity.authorize(id)
      })

      afterEach(() => {
        timekeeper.reset()
      })

      it('adds a random nonce to the auth', () => {
        expect(randomBytes).to.have.been.calledOnce()
        expect(randomBytes).to.have.been.calledWith(32)
        expect(auth).to.have.property('nonce', fakeRandom.toString('base64'))
      })

      it('adds a timestamp to the auth', () => {
        expect(auth).to.have.property('timestamp', timeInSeconds.toString())
      })

      it('signs the payload', () => {
        expect(identity.sign).to.have.been.calledOnce()
        expect(identity.sign).to.have.been.calledWith(`${timeInSeconds.toString()},${fakeRandom.toString('base64')},${id}`)
      })

      it('adds the signature to the auth', () => {
        expect(auth).to.have.property('signature', fakeSign)
      })
    })

    describe.skip('#signRequest', () => {
      let url
      let metadata
      let fakeRandom = Buffer.from('fake')
      let fakeSign = 'signature'
      let timeNow

      beforeEach(() => {
        url = 'someurl'
        randomBytes.returns(fakeRandom)
        identity.sign = sinon.stub().returns(fakeSign)
        timeNow = new Date()
        timekeeper.freeze(timeNow)

        metadata = identity.signRequest(url)
      })

      afterEach(() => {
        timekeeper.reset()
      })

      it('creates metadata', () => {
        expect(metadata).to.be.instanceOf(Metadata)
      })

      it('adds the pub key to the metadata', () => {
        expect(Metadata.prototype.set).to.have.been.calledWith('pubkey', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWOrLBCKQBQkiMJaIV5A05HqWFmR2GR5j8B19bxx7Th3/zmm7mZ8lNyseTr1YO7BwN7jKEbMe8Agx5LLCd/IP/A==')
      })

      it('adds a random nonce to the metadata', () => {
        expect(randomBytes).to.have.been.calledOnce()
        expect(randomBytes).to.have.been.calledWith(32)
        expect(Metadata.prototype.set).to.have.been.calledWith('nonce', fakeRandom.toString('base64'))
      })

      it('adds a timestamp to the metadata', () => {
        expect(Metadata.prototype.set).to.have.been.calledWith('timestamp', timeNow.getTime().toString())
      })

      it('signs the payload', () => {
        expect(identity.sign).to.have.been.calledOnce()
        expect(identity.sign).to.have.been.calledWith(`${timeNow.getTime().toString()},${fakeRandom.toString('base64')},${url}`)
      })

      it('adds the signature to the payload', () => {
        expect(Metadata.prototype.set).to.have.been.calledWith('signature', fakeSign)
      })
    })
  })

  describe('.load', () => {
    beforeEach(() => {
      Identity.prototype.loadSync = sinon.stub()
    })

    it('creates a new identity instance', () => {
      const identity = Identity.load(privKeyPath, pubKeyPath)
      expect(identity).to.be.instanceOf(Identity)
      expect(identity.privKeyPath).to.be.eql(privKeyPath)
      expect(identity.pubKeyPath).to.be.eql(pubKeyPath)
    })

    it('loads the identity from disk', () => {
      Identity.load(privKeyPath, pubKeyPath)
      expect(Identity.prototype.loadSync).to.have.been.calledOnce()
    })
  })
})
