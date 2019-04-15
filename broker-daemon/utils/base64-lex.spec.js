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

  it('strips off base64 padding', () => {
    // base64 encoding will have padding of only 1 or 2 '='
    // (3 bytes are represented in 4 6-bit base64 digits, i.e. encoding is mod 3)
    expect(encodeBase64Lex('12345=')).to.be.eql('pqrst')
    expect(encodeBase64Lex('12345==')).to.be.eql('pqrst')
  })

  it('preserves lexicographic ordering for numbers vs uppercase letters', () => {
    base64LowerIndex = 'A' // base64 index for 'A' is 0
    base64HigherIndex = '0' // base64 index for '0' is 52

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64LowerIndex.charCodeAt(0)).to.be.greaterThan(base64HigherIndex.charCodeAt(0))

    lexLowerIndex = encodeBase64Lex(base64LowerIndex)
    lexHigherIndex = encodeBase64Lex(base64HigherIndex)

    expect(lexLowerIndex.charCodeAt(0)).to.be.lessThan(lexHigherIndex.charCodeAt(0))
  })

  it('preserves lexicographic ordering for numbers vs lowercase letters', () => {
    base64LowerIndex = 'a' // base64 index for 'a' is 26
    base64HigherIndex = '0' // base64 index for '0' is 52

    // ASCII character codes would incorrectly sort based on base64 in this case
    expect(base64LowerIndex.charCodeAt(0)).to.be.greaterThan(base64HigherIndex.charCodeAt(0))

    lexLowerIndex = encodeBase64Lex(base64LowerIndex)
    lexHigherIndex = encodeBase64Lex(base64HigherIndex)

    expect(lexLowerIndex.charCodeAt(0)).to.be.lessThan(lexHigherIndex.charCodeAt(0))
  })

  it('preserves lexicographic ordering for `/`', () => {
    base64LowerIndex = '0' // base64 index for '0' is 52
    base64HigherIndex = '/' // base64 index for '/' is 63

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64LowerIndex.charCodeAt(0)).to.be.greaterThan(base64HigherIndex.charCodeAt(0))

    lexLowerIndex = encodeBase64Lex(base64LowerIndex)
    lexHigherIndex = encodeBase64Lex(base64HigherIndex)

    expect(lexLowerIndex.charCodeAt(0)).to.be.lessThan(lexHigherIndex.charCodeAt(0))
  })

  it('preserves lexicographic ordering for `+`', () => {
    base64LowerIndex = '0' // base64 index for '0' is 52
    base64HigherIndex = '+' // base64 index for '+' is 62

    // ASCII character codes would incorrectly sort based on base64 for this case
    expect(base64LowerIndex.charCodeAt(0)).to.be.greaterThan(base64HigherIndex.charCodeAt(0))

    lexLowerIndex = encodeBase64Lex(base64LowerIndex)
    lexHigherIndex = encodeBase64Lex(base64HigherIndex)

    expect(lexLowerIndex.charCodeAt(0)).to.be.lessThan(lexHigherIndex.charCodeAt(0))
  })

  it('preserves lexicographic ordering for data used as order IDs', () => {
    // When the following timestamps are base64 encoded, they lose their ordering by timestamp
    // Using encodeBase64Lex preserves the ordering by timestamp
    const timestamps = [
      1554914185000,
      1554505000000,
      1554831515000
    ]

    const expected = [
      'M9US9-', // corresponds to 1554505000000
      'M9nNak', // corresponds to 1554831515000
      'M9sQXF' // corresponds to 1554914185000
    ]

    // Convert timestamps to base64 encoding then convert to lex ordering
    const lexIds = []
    timestamps.forEach(ts => {
      const id = Buffer.alloc(4)
      id.writeUInt32BE(ts / 1000)
      lexIds.push(encodeBase64Lex(id.toString('base64')))
    })

    lexIds.sort()

    expect(lexIds).to.be.eql(expected)
  })
})
