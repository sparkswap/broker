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
 * @param {Function} responses.GetSupportedMarketsResponse
 * @returns {GetSupportedMarketsResponse}
 */
async function getSupportedMarkets ({ params, relayer, logger, engines, orderbooks }, { GetSupportedMarketsResponse }) {
  try {
    var { markets } = await relayer.adminService.getMarkets({})
  } catch (e) {
    throw new Error('Failed to get markets from relayer')
  }

  const supportedMarkets = markets.reduce((acc, market) => {
    if (!orderbooks.get(market)) {
      return acc
    }

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

  return new GetSupportedMarketsResponse({ supportedMarkets })
}

module.exports = getSupportedMarkets
