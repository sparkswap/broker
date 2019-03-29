/**
 * Grpc Deadline
 * @module broker-daemon/utils/grpc-deadline
 */

/**
 * Default gRPC deadline timeout for rpc calls on the broker.
 *
 * We've chosen 10 seconds as a conservative deadline because some calls to
 * engine RPCs take around 5 seconds which produced false negatives when the default
 * was set at a lower number
 *
 * @constant
 * @type {number}
 * @default
 */
const DEFAULT_TIMEOUT_IN_SECONDS = 10

/**
 * gRPC uses the term `deadline` which is a timeout feature that is an absolute
 * point in time, instead of a duration.
 *
 * @param {number} [timeoutInSeconds=DEFAULT_TIMEOUT_IN_SECONDS]
 * @returns {number} deadline in seconds
 */
function grpcDeadline (timeoutInSeconds = DEFAULT_TIMEOUT_IN_SECONDS) {
  return new Date().setSeconds(new Date().getSeconds() + timeoutInSeconds)
}

module.exports = grpcDeadline
