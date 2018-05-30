const fs = require('fs')
const grpc = require('grpc')

const PROTO_FILE_TYPE = 'proto'
const PROTO_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true,
  enumsAsStrings: true
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

  return grpc.load(protoPath, PROTO_FILE_TYPE, PROTO_OPTIONS)
}

module.exports = loadGrpcProto
