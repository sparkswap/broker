const fs = require('fs')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const PROTO_OPTIONS = {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}

/**
 * Loads a given proto file path into a grpc proto definition
 *
 * @param {String} protoPath
 * @return {Object} loaded grpc proto object
 * @throws {Error} proto does not exist
 */
function loadGrpcProto (protoPath) {
  if (!fs.existsSync(protoPath)) {
    throw new Error(`Proto does not exist at ${protoPath}. please run 'npm run build'`)
  }

  const packageDefinition = protoLoader.loadSync(protoPath, PROTO_OPTIONS)
  return grpc.loadPackageDefinition(packageDefinition)
}

module.exports = loadGrpcProto
