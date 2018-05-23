/**
 * Grpc Deadline
 * @module broker-daemon/utils/grpc-deadline
 */

/**
 * @constant
 * @type {Number}
 * @default
 */
const DEFAULT_TIMEOUT_IN_SECONDS = 5

/**
 * gRPC uses the term `deadline` which is a timeout feature that is an absolute
 * point in time, instead of a duration.
 *
 * @param {Number} [timeoutInSeconds=DEFAULT_TIMEOUT_IN_SECONDS]
 * @return {Number} deadline in seconds
 */
function grpcDeadline (timeoutInSeconds = DEFAULT_TIMEOUT_IN_SECONDS) {
  return new Date().setSeconds(new Date().getSeconds() + timeoutInSeconds)
}

module.exports = grpcDeadline
