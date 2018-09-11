/**
 * Gets valid markets from the relayer and populates market information for these markets
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {Map<Orderbook>} request.orderbooks
 *
 * @param {Object} responses
 * @param {function} responses.GetSupportedMarketsResponse - constructor for GetSupportedMarketsResponse messages
 * @return {responses.GetSupportedMarketsResponse}
 */
async function getSupportedMarkets ({ params, relayer, logger, engines, orderbooks }, { GetSupportedMarketsResponse }) {
  const { markets } = await relayer.infoService.getMarkets({})

  const supportedMarkets = markets.reduce((acc, market) => {
    if (!orderbooks.get(market)) return acc
    const [base, counter] = market.split('/')
    const marketInfo = {
      id: market,
      symbol: market,
      base,
      counter,
      active: true
    }
    acc.push(marketInfo)
    return acc
  }, [])
  return new GetSupportedMarketsResponse({supportedMarkets})
}

module.exports = getSupportedMarkets
