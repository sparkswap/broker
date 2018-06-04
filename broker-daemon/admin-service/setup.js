const { EXCHANGE_LND_HOST } = process.env

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {RelayerClient} request.relayer - grpc Client for interacting with the Relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engine
 * @param {Object} responses
 * @param {function} responses.SetupResponse - constructor for HealthCheckResponse messages
 * @return {responses.SetupResponse}
 */
async function setup ({ params, relayer, logger, engine }, { SetupResponse }) {
  const { publicKey: relayerPubKey } = await relayer.getPublicKey()
  await engine.createChannel(EXCHANGE_LND_HOST, relayerPubKey, '20000')
  return new SetupResponse({ status: 'channel opened successfully' })
}

module.exports = setup
