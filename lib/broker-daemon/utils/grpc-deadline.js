const DEFAULT_TIMEOUT_IN_SECONDS = 5;
function grpcDeadline(timeoutInSeconds = DEFAULT_TIMEOUT_IN_SECONDS) {
    return new Date().setSeconds(new Date().getSeconds() + timeoutInSeconds);
}
module.exports = grpcDeadline;
//# sourceMappingURL=grpc-deadline.js.map