const { readFileSync } = require('fs')
const { randomBytes, createSign } = require('crypto')
const { Metadata } = require('grpc')
const { nowInSeconds } = require('../utils')
const PUB_KEY_MARKERS = {
  START: '-----BEGIN PUBLIC KEY-----',
  END: '-----END PUBLIC KEY-----'
}

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
    this.pubKeyBase64 = pubKeyToBase64(this.pubKey)
  }

  /**
   * Sign data with this identity's private key
   * @param  {String} data to sign
   * @return {String} Base64 encoded signature of the data
   * @throws {Error} If private key is not loaded
   */
  sign (data) {
    if (typeof this.privKey !== 'string' || !this.privKey) {
      throw new Error('Cannot create a signature without a private key.')
    }
    const sign = createSign('sha256')
    sign.update(data)
    return sign.sign(this.privKey, 'base64')
  }

  /**
   * @typedef {Object} Authorization
   * @property {String} timestamp Int64 string of the current unix timestamp in seconds
   * @property {String} nonce base64 string of 32 random bytes
   * @property {String} signature base64 string of the signature that authorizes it
   */

  /**
   * Authorize a gRPC Request by adding metadata to it.
   *
   * Specifically, the signature is of the following payload:
   *  - a string name of the request [ what format? ]
   *  - timestamp of the request, in seconds. A timestamp within +/- 60 seconds of the Relayer's time should be accepted.
   *  - A random nonce of 32 bytes, represented in base64. This nonce should not be repeated, but the Relayer may not reject duplicate nonces older than 24 hours.
   *  - Contents of the request, JSON stringified
   *
   * This payload is joined by commas (','), and signed using the public key of the broker.
   *
   * The request can then be validated by the Relayer as being genuine from the owner of the public key.
   * @param  {string} action action to authorize the request for
   * @param  {object} params Parameters of the request to authorize
   * @return {grpc.Metadata} Metadata object with necessary items to verify it
   */
  authorize (action, params) {
    const request = `${action}:${JSON.stringify(params)}`
    const timestamp = nowInSeconds().toString()
    const nonce = randomBytes(32).toString('base64')
    const payload = [ timestamp, nonce, request ].join(',')
    const signature = this.sign(payload)
    const pubKey = this.pubKeyBase64

    const metadata = new Metadata()
    metadata.set('authorization', `${pubKey},${timestamp},${nonce},${signature}`)

    return metadata
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

/**
 * Strip the PEM file banners and newlines, returning just the PEM-encoded contents of a public key file
 * @param  {String} fileContents - string of a PEM file
 * @return {String} Pem-encoded public key without newlines or banners
 */
function pubKeyToBase64 (fileContents) {
  if (!fileContents) {
    throw new Error('Public Key is empty. Check that you have specified the correct cert path')
  }

  const strippedContents = fileContents.replace(/\r?\n|\r/g, '')

  if (!strippedContents.startsWith(PUB_KEY_MARKERS.START) || !strippedContents.endsWith(PUB_KEY_MARKERS.END)) {
    throw new Error('Public Key should be in PEM printable format')
  }
  return strippedContents.substring(PUB_KEY_MARKERS.START.length, strippedContents.length - PUB_KEY_MARKERS.END.length)
}

module.exports = Identity
