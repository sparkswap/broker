
// gRPC uses the term `deadline` which is a timeout feature that is an absolute
// point in time, instead of a duration.
function grpcDeadline (timeoutInSeconds = 5) {
  new Date().setSeconds(new Date().getSeconds() + timeoutInSeconds)
}

module.exports = { grpcDeadline }
