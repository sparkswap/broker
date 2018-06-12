/**
 * Check the health of all the system components
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.HealthCheckResponse - constructor for HealthCheckResponse messages
 * @return {responses.HealthCheckResponse}
 */
async function getInfo ({ logger, engine }, { GetInfoResponse }) {
  const publicKey = await engine.getPublicKey({})

  const {
    MARKETS: markets,
    EXCHANGE_RPC_HOST: exchangeRpcHost,
    EXCHANGE_LND_HOST: exchangeLndHost
  } = process.env

  return new GetInfoResponse({
    publicKey,
    exchangeLndHost,
    exchangeRpcHost,
    markets
  })
}

module.exports = getInfo
