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
   */
  loadSync () {
    if (!this.privKeyPath) {
      throw new Error('Private Key path is required to load a Relayer Identity')
    }
    if (!this.pubKeyPath) {
      throw new Error('Public Key path is required to load a Relayer Identity')
    }
    this.privKey = readFileSync(this.privKeyPath)
    this.pubKey = readFileSync(this.pubKeyPath)
  }

  /**
   * Sign data with this identity's private key
   * @param  {String} Base64 encoded data to sign
   * @return {String} Base64 encoded signature of the data
   */
  sign (data) {
    if (!this.privKey) {
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
