const grpc = require('grpc')

const grpcDeadline = require('./grpc-deadline')

/**
 * gRPC client interceptor that allows us to set a deadline for all calls in a
 * service
 *
 * @param {Object} options
 * @param {Function} nextCall
 * @returns {grpc.InterceptingCall}
 */
function grpcDeadlineInterceptor (options, nextCall) {
  // The method_definition object is defined in the grpc nodejs docs here:
  // https://grpc.io/grpc/node/grpc.html#~MethodDefinition
  const {
    requestStream,
    responseStream
  } = options.method_definition

  // If the request is a stream, then we do not want to set a deadline. Setting
  // a deadline on a stream will break it at that particular interval.
  if (requestStream || responseStream) {
    return new grpc.InterceptingCall(nextCall(options))
  }

  // Check to make sure deadline isn't set in the individual options of a specific call
  if (!options.hasOwnProperty('deadline')) {
    options.deadline = grpcDeadline()
  }

  return new grpc.InterceptingCall(nextCall(options))
}

module.exports = grpcDeadlineInterceptor
