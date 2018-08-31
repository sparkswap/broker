/**
 * Gets valid markets from the relayer and populates market information for these markets
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {Map<Orderbook>} request.orderbooks

 * @param {Object} responses
 * @param {function} responses.EmptyResponse
 * @return {responses.EmptyResponse}
 */
async function getSupportedMarkets ({ params, relayer, logger, engines, orderbooks }, { GetSupportedMarketsResponse }) {
  const { markets } = await relayer.infoService.getMarkets({})

  let supportedMarkets = []
  markets.forEach((market) => {
    if (orderbooks.get(market)) {
      const [base, counter] = market.split('/')
      const marketInfo = {
        id: market,
        symbol: market,
        base,
        counter,
        active: true,
        precision: 16
      }
      supportedMarkets.push(marketInfo)
    }
  })
  return new GetSupportedMarketsResponse({supportedMarkets})
}

module.exports = getSupportedMarkets
