/**
 * Generic Response class for a grpc call
 */
class GrpcResponse {
  /**
   * Create a new grpc response representation
   * @param {object} params - to set on the constructor
   */
  constructor (params = {}) {
    Object.assign(this, params)
  }
}

module.exports = GrpcResponse
