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
 * @param {Logger} logger
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
function handle404 (logger, req, res) {
  logger.debug('Received request but had no route', { url: req.url })
  res.status(404).send('404')
}

/**
 * creates an express app/server with the given protopath and rpcAddress
 *
 * @param {string} protoPath
 * @param {string} rpcAddress
 * @param {Object} opts
 * @param {boolean} [opts.disableAuth=false]
 * @param {boolean} [opts.enableCors=false]
 * @param {string} opts.privKeyPath
 * @param {string} opts.pubKeyPath
 * @param {string} opts.logger
 * @returns {ExpressApp}
 */
function createHttpServer (protoPath, rpcAddress, { disableAuth = false, enableCors = false, isCertSelfSigned = true, privKeyPath, pubKeyPath, httpMethods, logger }) {
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

  if (disableAuth) {
    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress, { whitelist: httpMethods }))
    app.use(handle404.bind(null, logger))
    return app
  } else {
    const key = fs.readFileSync(privKeyPath)
    const cert = fs.readFileSync(pubKeyPath)

    let channelCredentials = grpc.credentials.createSsl()

    if (isCertSelfSigned) {
      logger.debug(`Using self-signed cert to connect to internal RPC for proxy: cert: ${pubKeyPath}`)
      channelCredentials = grpc.credentials.createSsl(cert)
    }

    app.use('/', grpcGateway([`/${protoPath}`], rpcAddress, { credentials: channelCredentials, whitelist: httpMethods }))
    app.use(handle404.bind(null, logger))

    logger.debug(`Securing RPC proxy connections with TLS: key: ${privKeyPath}, cert: ${pubKeyPath}`)
    return https.createServer({ key, cert }, app)
  }
}

module.exports = createHttpServer
