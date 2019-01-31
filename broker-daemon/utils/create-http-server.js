const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const https = require('https')
const fs = require('fs')
const grpc = require('grpc')

const grpcGateway = require('./grpc-gateway')
const corsMiddleware = require('./enable-cors')

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
function createHttpServer (protoPath, rpcAddress, { disableAuth = false, enableCors = false, privKeyPath, pubKeyPath, logger }) {
  const app = express()

  app.use(helmet())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

  if (enableCors) {
    app.use(corsMiddleware())
  }

  // If the RPC address we use for daemon is set to a default route (0.0.0.0)
  // then we want to make sure that we are instead making a request w/ grpc-gateway
  // to local host since 0.0.0.0 would be an invalid address w/ the current cert
  // setup
  if (rpcAddress.includes('0.0.0.0')) {
    rpcAddress = rpcAddress.replace('0.0.0.0', 'localhost')
  }

  if (disableAuth) {
    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress))

    // Handle 404s correctly for the server
    app.use((req, res, _next) => {
      logger.debug('Received request but had no route', { url: req.url })
      res.status(404).send('404')
    })

    return app
  } else {
    const key = fs.readFileSync(privKeyPath)
    const cert = fs.readFileSync(pubKeyPath)
    const channelCredentials = grpc.credentials.createSsl(cert)

    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress, channelCredentials))

    // Handle 404s correctly for the server
    app.use((req, res, _next) => {
      logger.debug('Received request but had no route', { url: req.url })
      res.status(404).send('404')
    })

    logger.debug(`Securing RPC proxy connections with TLS: key: ${privKeyPath}, cert: ${pubKeyPath}`)

    return https.createServer({ key, cert }, app)
  }
}

module.exports = createHttpServer
