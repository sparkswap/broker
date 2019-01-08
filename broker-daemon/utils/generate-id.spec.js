const path = require('path')
const { sinon, rewire, expect, timekeeper } = require('test/test-helper')

const generateId = rewire(path.resolve(__dirname, 'generate-id'))

describe('generateId', () => {
  describe('generateId', () => {
    let urlEncode
    let crypto
    let resetUrlEncode
    let resetCrypto
    let randomData
    let randomHex
    let randomBase64
    let randomUrlEncoded
    let timestamp
    let timeInSeconds

    beforeEach(() => {
      timestamp = 1532045654371
      timeInSeconds = 1532045654
      timekeeper.freeze(new Date(timestamp))
      randomData = Buffer.from('deadbeefdeadbeef', 'hex')

      randomHex = timeInSeconds.toString(16) + 'deadbeefdeadbeef'

      // the data should be the timestamp on the front, followed by
      // our random data at the end
      randomBase64 = Buffer.from(randomHex, 'hex').toString('base64')
      randomUrlEncoded = 'asfdjJF09809ASDFasdf-asdf_asdf'

      urlEncode = sinon.stub().returns(randomUrlEncoded)

      crypto = {
        randomBytes: sinon.stub().returns(randomData)
      }

      resetUrlEncode = generateId.__set__('urlEncode', urlEncode)
      resetCrypto = generateId.__set__('crypto', crypto)
    })

    afterEach(() => {
      resetUrlEncode()
      resetCrypto()
      timekeeper.reset()
    })

    it('creates random hex data', () => {
      generateId()

      expect(crypto.randomBytes).to.have.been.calledOnce()
      expect(crypto.randomBytes).to.have.been.calledWith(8)
    })

    it('url encodes the data', () => {
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
