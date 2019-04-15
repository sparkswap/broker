const { expect } = require('test/test-helper')

const encodeBase64Lex = require('./base64-lex')

// The reason base64 doesn't preserve lexicographic order is because the index encoding
// values for base64 do not match up with the index encoding values for ASCII characters.
//
// Base64 increases index using the pattern [A-Z][a-z][0-9][+][/]
// ASCII increases index using the pattern [-][0-9][A-Z][_][a-z]
describe('encodeBase64Lex', () => {
  let base64LowerIndex
  let base64HigherIndex
  let lexLowerIndex
  let lexHigherIndex
  let lowerBase64Encoded
  let higherBase64Encoded
  let base64Encodings
  let lexEncodings

  it('strips off base64 padding', () => {
    // base64 encoding will have padding of only 1 or 2 '='
    // (3 bytes are represented in 4 6-bit base64 digits, i.e. encoding is mod 3)
    expect(encodeBase64Lex('12345=')).to.be.eql('pqrst')
    expect(encodeBase64Lex('12345==')).to.be.eql('pqrst')
  })

  it('preserves lexicographic ordering for numbers vs uppercase letters', () => {
    base64LowerIndex = Buffer.from('000000', 'hex') // base64 index for 0x00 is 'A'
    base64HigherIndex = Buffer.from('000034', 'hex') // base64 index for 0x34 is '0'

    lowerBase64Encoded = base64LowerIndex.toString('base64')
    higherBase64Encoded = base64HigherIndex.toString('base64')

    base64Encodings = [lowerBase64Encoded, higherBase64Encoded]
    base64Encodings.sort()

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64Encodings).to.be.eql([higherBase64Encoded, lowerBase64Encoded])

    lexLowerIndex = encodeBase64Lex(lowerBase64Encoded)
    lexHigherIndex = encodeBase64Lex(higherBase64Encoded)

    lexEncodings = [lexLowerIndex, lexHigherIndex]
    lexEncodings.sort()

    expect(lexEncodings).to.be.eql([lexLowerIndex, lexHigherIndex])
  })

  it('preserves lexicographic ordering for numbers vs lowercase letters', () => {
    base64LowerIndex = Buffer.from('00001a', 'hex') // base64 index for 0x1a is 'a'
    base64HigherIndex = Buffer.from('000034', 'hex') // base64 index for 0x34 is '0'

    lowerBase64Encoded = base64LowerIndex.toString('base64')
    higherBase64Encoded = base64HigherIndex.toString('base64')

    base64Encodings = [lowerBase64Encoded, higherBase64Encoded]
    base64Encodings.sort()

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64Encodings).to.be.eql([higherBase64Encoded, lowerBase64Encoded])

    lexLowerIndex = encodeBase64Lex(lowerBase64Encoded)
    lexHigherIndex = encodeBase64Lex(higherBase64Encoded)

    lexEncodings = [lexLowerIndex, lexHigherIndex]
    lexEncodings.sort()

    expect(lexEncodings).to.be.eql([lexLowerIndex, lexHigherIndex])
  })

  it('preserves lexicographic ordering for `/`', () => {
    base64LowerIndex = Buffer.from('000034', 'hex') // base64 index for 0x34 is '0'
    base64HigherIndex = Buffer.from('00003f', 'hex') // base64 index for 0x3f is '/'

    lowerBase64Encoded = base64LowerIndex.toString('base64')
    higherBase64Encoded = base64HigherIndex.toString('base64')

    base64Encodings = [lowerBase64Encoded, higherBase64Encoded]
    base64Encodings.sort()

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64Encodings).to.be.eql([higherBase64Encoded, lowerBase64Encoded])

    lexLowerIndex = encodeBase64Lex(lowerBase64Encoded)
    lexHigherIndex = encodeBase64Lex(higherBase64Encoded)

    lexEncodings = [lexLowerIndex, lexHigherIndex]
    lexEncodings.sort()

    expect(lexEncodings).to.be.eql([lexLowerIndex, lexHigherIndex])
  })

  it('preserves lexicographic ordering for `+`', () => {
    base64LowerIndex = Buffer.from('000034', 'hex') // base64 index for 0x34 is '0'
    base64HigherIndex = Buffer.from('00003e', 'hex') // base64 index for 0x3e is '+'

    lowerBase64Encoded = base64LowerIndex.toString('base64')
    higherBase64Encoded = base64HigherIndex.toString('base64')

    base64Encodings = [lowerBase64Encoded, higherBase64Encoded]
    base64Encodings.sort()

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64Encodings).to.be.eql([higherBase64Encoded, lowerBase64Encoded])

    lexLowerIndex = encodeBase64Lex(lowerBase64Encoded)
    lexHigherIndex = encodeBase64Lex(higherBase64Encoded)

    lexEncodings = [lexLowerIndex, lexHigherIndex]
    lexEncodings.sort()

    expect(lexEncodings).to.be.eql([lexLowerIndex, lexHigherIndex])
  })

  it('preserves lexicographic ordering for multiple data inputs', () => {
    // The following hex data will not be ordered lexicographically when the base64 characters are
    // sorted using ASCII character codes
    const trickyData = [
      Buffer.from('000000', 'hex'), // base64 index for 'A'
      Buffer.from('00001a', 'hex'), // base64 index for 'a'
      Buffer.from('000034', 'hex'), // base64 index for '0'
      Buffer.from('00003e', 'hex'), // base64 index for '+'
      Buffer.from('00003f', 'hex') // base64 index for '/'
    ]

    const lexIds = trickyData.map(data => {
      return encodeBase64Lex(data.toString('base64'))
    }).sort()

    const expected = [
      '----', // 0x00 in base64
      '---P', // 0x1a in base64
      '---o', // 0x34 in base64
      '---y', // 0x3e in base64
      '---z' // 0x3f in base64
    ]

    expect(lexIds).to.be.eql(expected)
  })
})
