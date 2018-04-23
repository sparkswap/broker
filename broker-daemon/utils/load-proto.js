const path = require('path')
const grpc = require('grpc')

const PROTO_FILE_TYPE = 'proto'
const PROTO_OPTIONS = {
  convertFieldsToCamelCase: true,
  binaryAsBase64: true,
  longsAsStrings: true
}

function loadGrpc (protoPath) {
  const resolvedPath = path.resolve(protoPath)
  return grpc.load(resolvedPath, PROTO_FILE_TYPE, PROTO_OPTIONS)
}

module.exports = loadGrpc
