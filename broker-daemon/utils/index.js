const getRecords = require('./get-records')
const logger = require('./logger')
const loadProto = require('./load-proto')
const grpcDeadline = require('./grpc-deadline')

module.exports = {
  getRecords,
  logger,
  loadProto,
  grpcDeadline
}
