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
  const daemonPublicKey = await engine.getPublicKey({})

  const {
    MARKETS: daemonDefaultMarkets,
    RELAYER_RPC_HOST: relayerRpcHost,
    EXCHANGE_LND_HOST: relayerLndHost,
    LND_EXTERNAL_ADDRESS: daemonLndHost,
    EXTERNAL_ADDRESS: daemonRpcHost
  } = process.env

  return new GetDaemonConfigResponse({
    relayerRpcHost,
    relayerLndHost,
    daemonRpcHost,
    daemonLndHost,
    daemonPublicKey,
    daemonDefaultMarkets
  })
}

module.exports = getDaemonConfig
