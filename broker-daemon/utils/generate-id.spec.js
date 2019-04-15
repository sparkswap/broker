const path = require('path')
const { sinon, rewire, expect, timekeeper } = require('test/test-helper')

const generateId = rewire(path.resolve(__dirname, 'generate-id'))

describe('generateId', () => {
  let base64LexStub
  let cryptoStub
  let resetBase64LexStub
  let resetCryptoStub
  let randomData
  let randomHex
  let randomBase64
  let randomBase64Lex
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
    randomBase64 = Buffer.from(randomHex, 'hex')
    randomBase64Lex = 'asfdjJF09809ASDFasdf-asdf_asdf'

    base64LexStub = sinon.stub().returns(randomBase64Lex)

    cryptoStub = {
      randomBytes: sinon.stub().returns(randomData)
    }

    resetBase64LexStub = generateId.__set__('base64Lex', base64LexStub)
    resetCryptoStub = generateId.__set__('crypto', cryptoStub)
  })

  afterEach(() => {
    resetBase64LexStub()
    resetCryptoStub()
    timekeeper.reset()
  })

  it('creates random hex data', () => {
    generateId()

    expect(cryptoStub.randomBytes).to.have.been.calledOnce()
    expect(cryptoStub.randomBytes).to.have.been.calledWith(8)
  })

  it('converts the base64 data to lexicographical order', () => {
    expect(generateId()).to.be.eql(randomBase64Lex)

    expect(base64LexStub).to.have.been.calledOnce()
    expect(base64LexStub).to.have.been.calledWith(randomBase64)
  })
})
