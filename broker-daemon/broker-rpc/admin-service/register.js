/**
 * Register the publicKey with the authorization service on the Relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.RegisterResponse - constructor for RegisterResponse messages
 * @return {RegisterResponse}
 */
async function register ({ params, relayer, logger }, { RegisterResponse }) {
  const { publicKey } = params

  const { entityId } = await relayer.adminService.register({publicKey})

  return new RegisterResponse({ entityId })
}

module.exports = register
