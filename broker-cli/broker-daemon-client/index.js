const path = require('path')
const grpc = require('grpc')
const caller = require('grpc-caller')
const { readFileSync } = require('fs')

const { loadConfig } = require('./config')
const { loadProto } = require('../utils')

/**
 * @constant
 * @type {String}
 * @default
 */
const PROTO_PATH = path.resolve(__dirname, '..', 'proto', 'broker.proto')

/**
 * @constant
 * @type {Number}
 * @default
 */
const DEFAULT_RPC_PORT = 27492

/**
 * Root path from the current module used to resolve cert file paths
 * @constant
 * @type {String}
 * @default
 */
const PROJECT_ROOT_DIR = '../'

/**
 * Creates a basic auth string from user/password credentials
 * @param {String} username
 * @param {String} password
 * @return {String} res - basic auth token
 */
function credentialToBasicAuth (username, password) {
  return `Basic ${username}:${password}`
}

/**
 * Generates authorization metadata for a basic auth token
 *
 * @param {String} username
 * @param {String} password
 * @return {grpc.Metadata}
 */
function generateBasicAuthMetaData (username, password) {
  const rawBasicAuth = credentialToBasicAuth(username, password)
  const basicAuth = Buffer.from(rawBasicAuth).toString('base64')
  const metadata = new grpc.Metadata()
  metadata.set('Authorization', basicAuth)
  return metadata
}

/**
 * Generates call credentials for the broker daemon
 *
 * @return {grpc.credentials}
 */
function generateCallCredentials (username, password) {
  return grpc.credentials.createFromMetadataGenerator(({ _ }, callback) => {
    const metadata = generateBasicAuthMetaData(username, password)
    callback(null, metadata)
  })
}

/**
 * Given a buffer containing a valid x509 cert key, we return grpc ssl credentials
 *
 * @param {Buffer} cert
 * @return {grpc.credentials}
 */
function generateSslCredentials (cert) {
  return grpc.credentials.createSsl(cert)
}

class BrokerDaemonClient {
  /**
   * @param {String} [rpcAddress=null] - grpc host address
   */
  constructor (rpcAddress = null) {
    this.config = loadConfig()

    /**
     * Broker Daemon grpc host address
     *
     * If not set, defaults to the user settings at ~/.sparkswap.js
     * or the installation settings at ../sparkswap.js
     *
     * Port defaults to DEFAULT_RPC_PORT if tld is passed in
     *
     * @see {DEFAULT_RPC_PORT}
     * @type {String}
     */
    this.address = rpcAddress || this.config.rpcAddress
    this.certPath = this.config.rpcCert
    this.disableAuth = this.config.disableAuth
    this.username = this.config.username
    this.password = this.config.password

    const [host, port] = this.address.split(':')

    // Set a default port if the port is not specified
    if (!port) {
      this.address = `${host}:${DEFAULT_RPC_PORT}`
    }

    this.proto = loadProto(PROTO_PATH)

    if (this.disableAuth) {
      // TODO: Eventually allow broker daemon client to use the cli's logger
      console.warn('disableAuth is set to true. The CLI will try to connect to the daemon without ssl')
      this.credentials = grpc.credentials.createInsecure()
    } else {
      if (!this.username) throw new Error('No username is specified for authentication')
      if (!this.password) throw new Error('No password is specified for authentication')

      // Go back to the ./broker-cli/certs directory from the current directory
      this.cert = readFileSync(path.join(__dirname, PROJECT_ROOT_DIR, this.certPath))

      const channelCredentials = generateSslCredentials(this.cert)
      const callCredentials = generateCallCredentials(this.username, this.password)

      this.credentials = grpc.credentials.combineChannelCredentials(channelCredentials, callCredentials)
    }

    this.adminService = caller(this.address, this.proto.AdminService, this.credentials)
    this.orderService = caller(this.address, this.proto.OrderService, this.credentials)
    this.orderBookService = caller(this.address, this.proto.OrderBookService, this.credentials)
    this.walletService = caller(this.address, this.proto.WalletService, this.credentials)
  }
}

module.exports = BrokerDaemonClient
