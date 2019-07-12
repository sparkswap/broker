const { GrpcResponse: GetSupportedMarketsResponse } = require('../../utils')

/** @typedef {import('../broker-rpc-server').GrpcUnaryMethodRequest} GrpcUnaryMethodRequest */

/**
 * Gets valid markets from the relayer and populates market information for these markets
 *
 * @param {GrpcUnaryMethodRequest} request - request object
 * @returns {Promise<GetSupportedMarketsResponse>}
 */
async function getSupportedMarkets ({ relayer, orderbooks }) {
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
