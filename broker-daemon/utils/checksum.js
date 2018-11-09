const { createHash } = require('crypto')

/**
 * Length of a SHA-256 Hash in Bytes
 * @constant
 * @type {Number}
 */
const SHA256_BYTE_SIZE = 32

/**
 * Create a sha256 digest of a value
 * @param  {String} value Value to digest
 * @return {Buffer}       SHA-256 of the value
 */
function sha256 (value) {
  return createHash('sha256').update(value).digest()
}

/**
 * Perform a XOR on two buffers
 * @param  {Buffer} a
 * @param  {Buffer} b
 * @return {Buffer}   XOR'ed buffer
 */
function xor (a, b) {
  const length = Math.max(a.length, b.length)
  const buffer = Buffer.allocUnsafe(length)

  for (var i = 0; i < length; ++i) {
    buffer[i] = a[i] ^ b[i]
  }

  return buffer
}

/**
 * Create an updatable checksum of a set of data
 * @return {Object}
 * @example
 * const mysum = checksum()
 * mysum.check(sha256('hello')) // returns false
 * mysum.process('hello')
 * mysum.check(sha256('hello')) // returns true
 * mysum.process('hello')
 * mysum.check(sha256('hello')) // returns false
 */
function checksum () {
  return {
    sum: Buffer.alloc(SHA256_BYTE_SIZE),
    check (sum) {
      return this.sum.equals(sum)
    },
    process (value) {
      this.sum = xor(this.sum, sha256(value))
      return this
    }
  }
}

module.exports = checksum
