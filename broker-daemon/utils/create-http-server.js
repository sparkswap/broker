const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const https = require('https')
const fs = require('fs')
const grpc = require('grpc')

const grpcGateway = require('./grpc-gateway')

/**
 * creates an express app/server with the given protopath and rpcAddress
 *
 * @param {String} protoPath
 * @param {String} rpcAddress
 * @param {Object} opts
 * @param {Boolean} [disableAuth=false]
 * @param {String} privKeyPath
 * @param {String} pubKeyPath
 * @return {ExpressApp}
 */
function createHttpServer (protoPath, rpcAddress, { disableAuth = false, privKeyPath, pubKeyPath, logger }) {
  const app = express()

  app.use(helmet())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

  if (disableAuth) {
    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress))
    return app
  } else {
    const key = fs.readFileSync(privKeyPath)
    const cert = fs.readFileSync(pubKeyPath)
    const channelCredentials = grpc.credentials.createSsl(cert)

    logger.error('WHERE THE')
    logger.error(rpcAddress)

    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress, channelCredentials))

    logger.debug(`Securing http RPC connections with TLS: key: ${privKeyPath}, cert: ${pubKeyPath}`)

    return https.createServer({ key, cert }, app)
  }
}

module.exports = createHttpServer
