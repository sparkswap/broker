const DEFAULT_FUNDING_AMOUNT = 30000

/**
 * Opens a channel w/ the relayer
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.relayer
 * @param {Object} request.engine
 * @param {Object} request.logger
 * @param {Object} responses
 * @param {function} responses.OpenChannelResponse
 * @return {responses.OpenChannelResponse}
 */
async function openChannel ({ params, relayer, engine, logger }, { OpenChannelResponse }) {
  const { fundingAmount } = params
  const { publicKey } = await relayer.publicKey()
  const amount = fundingAmount || DEFAULT_FUNDING_AMOUNT
  const success = await engine.createChannel('docker.for.mac.host.internal:10111', publicKey, amount)

  return new OpenChannelResponse({ success })
}

module.exports = openChannel
