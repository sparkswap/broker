const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const generateId = rewire(path.resolve(__dirname, 'generate-id'))

describe('generateId', () => {
  describe('generateId', () => {
    let urlEncode
    let crypto
    let hash
    let bytes
    let resetUrlEncode
    let resetCrypto
    let randomString
    let randomBase64
    let randomUrlEncoded

    beforeEach(() => {
      randomString = 'aoisjdfoasijfd9sdfu0a9sdf09'
      randomBase64 = 'asfdjJF09809ASDFasdf+asdf/asdf='
      randomUrlEncoded = 'asfdjJF09809ASDFasdf-asdf_asdf'

      urlEncode = sinon.stub().returns(randomUrlEncoded)
      hash = {
        update: sinon.stub(),
        digest: sinon.stub().returns(randomBase64)
      }
      hash.update.returns(hash)

      bytes = {
        toString: sinon.stub().returns(randomString)
      }

      crypto = {
        randomBytes: sinon.stub().returns(bytes),
        createHash: sinon.stub().returns(hash)
      }

      resetUrlEncode = generateId.__set__('urlEncode', urlEncode)
      resetCrypto = generateId.__set__('crypto', crypto)
    })

    afterEach(() => {
      resetUrlEncode()
      resetCrypto()
    })

    it('creates random hex data', () => {
      generateId()

      expect(crypto.randomBytes).to.have.been.calledOnce()
      expect(crypto.randomBytes).to.have.been.calledWith(9)
      expect(bytes.toString).to.have.been.calledOnce()
      expect(bytes.toString).to.have.been.calledWith('hex')
    })

    it('hashes the random data', () => {
      generateId()

      expect(crypto.createHash).to.have.been.calledOnce()
      expect(crypto.createHash).to.have.been.calledWith('sha256')
      expect(hash.update).to.have.been.calledOnce()
      expect(hash.update).to.have.been.calledWith(randomString)
      expect(hash.digest).to.have.been.calledOnce()
      expect(hash.digest).to.have.been.calledWith('base64')
    })

    it('url encodes the hash', () => {
      expect(generateId()).to.be.eql(randomUrlEncoded)

      expect(urlEncode).to.have.been.calledOnce()
      expect(urlEncode).to.have.been.calledWith(randomBase64)
    })
  })

  describe('urlEncode', () => {
    let urlEncode

    beforeEach(() => {
      urlEncode = generateId.__get__('urlEncode')
    })

    it('strips off trailing equals signs', () => {
      expect(urlEncode('asf8asuf98uas9f8u===')).to.be.eql('asf8asuf98uas9f8u')
    })

    it('converts + to -', () => {
      expect(urlEncode('asdf+asdf+asdf')).to.be.eql('asdf-asdf-asdf')
    })

    it('converts / to _', () => {
      expect(urlEncode('asdf/asdf/asdf')).to.be.eql('asdf_asdf_asdf')
    })

    it('converts them all together', () => {
      expect(urlEncode('asdf/asdf+asdf/asdf+asdf==')).to.be.eql('asdf_asdf-asdf_asdf-asdf')
    })
  })
})
