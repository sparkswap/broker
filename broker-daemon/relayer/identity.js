const { readFileSync } = require('fs')
const { randomBytes, createSign } = require('crypto')
const { Metadata } = require('grpc')
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
   * Create metadata for a grpc request with this identity attached to it.
   * Specifically, attaches the public key to every request so that we
   * can authorize ourselves later.
   *
   * @return {grpc.Metadata}
   */
  identify () {
    const metadata = new Metadata()
    metadata.set('pubkey', this.pubKeyBase64)

    return metadata
  }

  /**
   * Sign data with this identity's private key
   * @param  {String} data to sign
   * @return {String} Base64 encoded signature of the data
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
   * Sign a request using the timestamp, nonce, and url of the request
   *
   * Specifically, the signature is of the following payload:
   *  - timestamp of the request, in seconds. A timestamp within +/- 60 seconds of the Relayer's time should be accepted.
   *  - A random nonce of 32 bytes, represented in base64. This nonce should not be repeated, but the Relayer may not reject duplicate nonces older than 24 hours.
   *  - url of the service (not sure what this is...)
   *
   * This payload is joined by commas (','), and signed using the public key of the broker.
   *
   * Each of these data elements is then added to the metadata, with the exception of the url, and with the addition of the public key and the signature.
   *
   * The request can then be validated by the Relayer as being genuine from the owner of the public key.
   * @param  {String}
   * @return {grpc.Metadata}
   */
  signRequest (url) {
    const timestamp = Date.now().toString()
    const nonce = randomBytes(32).toString('base64')
    const payload = [ timestamp, nonce, url ].join(',')
    const signature = this.sign(payload)
    const metadata = new Metadata()

    metadata.set('timestamp', timestamp)
    metadata.set('nonce', nonce)
    metadata.set('pubkey', this.pubKeyBase64)
    metadata.set('signature', signature)

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

function pubKeyToBase64 (fileContents) {
  const strippedContents = fileContents.replace(/\r?\n|\r/g, '')
  if (!strippedContents.startsWith(PUB_KEY_MARKERS.START) || !strippedContents.endsWith(PUB_KEY_MARKERS.END)) {
    throw new Error('Public Key should be in PEM printable format')
  }
  return strippedContents.substring(PUB_KEY_MARKERS.START.length, strippedContents.length - PUB_KEY_MARKERS.END.length)
}

module.exports = Identity
