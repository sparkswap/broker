/**
 * Exposes public configuration data from the daemon
 *
 * @param {GrpcUnaryMethod~request} request
 * @param {Logger} request.logger
 * @param {Engine} request.engine
 * @param {Object} responses
 * @param {function} responses.GetDaemonConfigResponse
 * @return {responses.GetDaemonConfigResponse}
 */
async function getDaemonConfig ({ logger, engine }, { GetDaemonConfigResponse }) {
  const publicKey = await engine.getPublicKey({})

  const {
    MARKETS: markets,
    EXCHANGE_RPC_HOST: exchangeRpcHost,
    EXCHANGE_LND_HOST: exchangeLndHost
  } = process.env

  return new GetDaemonConfigResponse({
    publicKey,
    exchangeLndHost,
    exchangeRpcHost,
    markets
  })
}

module.exports = getDaemonConfig
