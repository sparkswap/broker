const { PublicError } = require('grpc-methods')
const { convertBalance, Big } = require('../../utils')
const { currencies } = require('../../config')
/**
 * @constant
 * @type {Long}
 * @default
 */
const MINIMUM_FUNDING_AMOUNT = 400000

/**
 * This is the max allowed balance for a channel for LND while software is currently
 * in beta
 *
 * Maximum channel balance (no inclusive) is 2^32 or 16777216
 * More info: https://github.com/lightningnetwork/lnd/releases/tag/v0.3-alpha
 *
 * @todo make this engine agnostic (non-LND)
 * @constant
 * @type {Long}
 * @default
 */
const MAX_CHANNEL_BALANCE = 16777215

const SUPPORTED_SYMBOLS = currencies.reduce((obj, currency) => {
  obj[currency.symbol] = currency.symbol
  return obj
}, {})

/**
 * Grabs public lightning network information from relayer and opens a channel
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Logger} request.logger
 * @param {Engine} request.engines
 * @param {Object} responses
 * @param {function} responses.EmptyResponse
 * @return {responses.EmptyResponse}
 */
async function getSupportedMarkets ({ params, relayer, logger, engines, orderbooks }, { GetSupportedMarketsResponse }) {
  const { markets } = await relayer.infoService.getMarkets({})

  let supportedMarkets = []
  markets.forEach((market) => {
    // if orderbooks.get(market) {
    //   const [base, counter] = market.split('/')
    //   const marketInfo = {
    //     id: market,
    //     symbol: market,
    //     base,
    //     counter,
    //     active: true,
    //     precision: 16
    //   }
    //   supportedMarkets << marketInfo
    // }
  })
  return new GetSupportedMarketsResponse({supportedMarkets})
}

module.exports = getSupportedMarkets
