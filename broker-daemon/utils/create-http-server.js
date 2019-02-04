const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const https = require('https')
const fs = require('fs')
const grpc = require('grpc')

const grpcGateway = require('./grpc-gateway')
const corsMiddleware = require('./enable-cors')

/**
 * http 404 handler for our http (express) server
 *
 * @param {object} req - request object
 * @param {object} res - response object
 */
function handle404 (logger, req, res) {
  logger.debug('Received request but had no route', { url: req.url })
  res.status(404).send('404')
}

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

  // Log all requests for our http server
  app.use((req, _res, next) => {
    logger.info(`${req.ip} - broker-http-server "${req.method} ${req.url} ${req.protocol}" ${req.headers['user-agent']}`)
    next()
  })

  if (enableCors) {
    app.use(corsMiddleware())
  }

  // If the RPC address we use for daemon is set to a default route (0.0.0.0)
  // then we want to make sure that we are instead making a request w/ grpc-gateway
  // to `localhost`. `0.0.0.0` would be an invalid address w/ the current cert
  // setup
  if (rpcAddress.includes('0.0.0.0')) {
    rpcAddress = rpcAddress.replace('0.0.0.0', 'localhost')
  }

  if (disableAuth) {
    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress))
    app.use(handle404.bind(null, logger))
    return app
  } else {
    const key = fs.readFileSync(privKeyPath)
    const cert = fs.readFileSync(pubKeyPath)
    const channelCredentials = grpc.credentials.createSsl(cert)

    logger.debug(`Securing RPC proxy connections with TLS: key: ${privKeyPath}, cert: ${pubKeyPath}`)

    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress, channelCredentials))
    app.use(handle404.bind(null, logger))
    return https.createServer({ key, cert }, app)
  }
}

module.exports = createHttpServer
