const express = require('express')
const bodyParser = require('body-parser')
const grpcGateway = require('./grpc-gateway')

/**
 * creates an express app/server with the given protopath and rpcAddress
 *
 * @param {String} protoPath
 * @param {String} rpcAddress
 * @return {ExpressApp}
 */
function createHttpServer (protoPath, rpcAddress) {
  const app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use('/', grpcGateway([`/${protoPath}`], rpcAddress))
  return app
}

module.exports = createHttpServer
