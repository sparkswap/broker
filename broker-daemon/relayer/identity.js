const { readFileSync } = require('fs')
const crypto = require('crypto')

class Identity {
  /**
   * Create a new identity for a broker to use with the Relayer
   * @param  {String}  privKeyPath Absolute path to the private key to use for identity
   * @param  {String}  pubKeyPath  Absolute path to the public key to use for the identity
   * @return {Identity}
   */
  constructor (privKeyPath, pubKeyPath) {
    this.privKeyPath = privKeyPath
    this.pubKeyPath = pubKeyPath
  }

  /**
   * Load the identity (private and public key) from disk
   * @return {void}
   * @throws {Error} If Private key path is not defined
   * @throws {Error} If Public key path is not defined
   */
  loadSync () {
    if (!this.privKeyPath) {
      throw new Error('Private Key path is required to load a Relayer Identity')
    }
    if (!this.pubKeyPath) {
      throw new Error('Public Key path is required to load a Relayer Identity')
    }
    this.privKey = readFileSync(this.privKeyPath, 'utf8')
    this.pubKey = readFileSync(this.pubKeyPath, 'utf8')
  }

  /**
   * Sign data with this identity's private key
   * @param  {String} Base64 encoded data to sign
   * @return {String} Base64 encoded signature of the data
   * @throws {Error} If private key is not loaded
   */
  sign (data) {
    if (typeof this.privKey !== 'string' || !this.privKey) {
      throw new Error('Cannot create a signature without a private key.')
    }
    const sign = crypto.createSign('sha256')
    sign.update(Buffer.from(data, 'base64'))
    return sign.sign(this.privKey, 'base64')
  }
}

/**
 * Create and load a new identity for a broker to use with the Relayer
 * @param  {String}   privKeyPath Absolute path to the private key to use for identity
 * @param  {String}   pubKeyPath  Absolute path to the public key to use for the identity
 * @return {Identity}
 */
Identity.load = function (privKeyPath, pubKeyPath) {
  const id = new this(privKeyPath, pubKeyPath)
  id.loadSync()
  return id
}

module.exports = Identity
