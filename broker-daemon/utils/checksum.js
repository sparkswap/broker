const { createHash } = require('crypto')

/**
 * Length of a SHA-256 Hash in Bytes
 * @constant
 * @type {number}
 * @default
 */
const SHA256_BYTE_SIZE = 32

/**
 * Create a sha256 digest of a value
 * @param  {string} value - Value to digest
 * @returns {Buffer}       SHA-256 of the value
 */
function sha256 (value) {
  return createHash('sha256').update(value).digest()
}

/**
 * Perform a XOR on two buffers
 * @param  {Buffer} a
 * @param  {Buffer} b
 * @returns {Buffer}   XOR'ed buffer
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
 * @class An updatable checksum of a set of data.
 * Checksum uses a XOR of SHA-256 hashes of given data elements, providing
 * a checksum that can be easily added to and subtracted from.
 * @example
 * const mysum = new Checksum()
 * mysum.check(sha256('hello')) // returns false
 * mysum.process('hello')
 * mysum.check(sha256('hello')) // returns true
 * mysum.process('hello')
 * mysum.check(sha256('hello')) // returns false
 */
class Checksum {
  /**
   * Create a new checksum for a data set
   */
  constructor () {
    this.sum = Buffer.alloc(SHA256_BYTE_SIZE)
  }

  /**
   * Check that the provided sum matches our calculated sum
   * @param  {Buffer}  sum - Buffer of a checksum of equivalent length
   * @returns {boolean}     True if the checksums match, false otherwise
   * @throws {Error} If sum is not a Buffer
   * @throws {Error} If sum does not have the correct length
   */
  matches (sum) {
    if (!Buffer.isBuffer(sum)) {
      throw new Error(`Checksums can only be matched against Buffers`)
    }
    if (sum.length !== SHA256_BYTE_SIZE) {
      throw new Error(`Checksums can only be matched against Buffers of length ${SHA256_BYTE_SIZE}`)
    }
    return this.sum.equals(sum)
  }

  /**
   * Add a value to, or remove a value from the data set
   * @param  {string} value - Value to add to or remove from the data set, e.g. a unique ID
   * @returns {Checksum} Mutated checksum class, for easy chaining (e.g. mysum.process('a').process('b'))
   */
  process (value) {
    this.sum = xor(this.sum, sha256(value))
    return this
  }
}

module.exports = Checksum
