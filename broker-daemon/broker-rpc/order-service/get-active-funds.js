const { currencies } = require('../../config')

/**
 * Cancels a block order in progress
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @return {Object}
 */
async function getActiveFunds ({ params, logger, blockOrderWorker }) {
  const {
    market,
    side
  } = params

  try {
    const { activeOutboundAmount, activeInboundAmount } = await blockOrderWorker.calculateActiveFunds(market, side)
    const [baseSymbol, counterSymbol] = market.split('/')
    const outboundSymbol = side === 'BID' ? counterSymbol : baseSymbol
    const inboundSymbol = side === 'ASK' ? baseSymbol : counterSymbol

    const outboundDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === outboundSymbol).quantumsPerCommon
    const inboundDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === inboundSymbol).quantumsPerCommon

    return { activeOutboundAmount: activeOutboundAmount.div(outboundDivideBy).toString(), activeInboundAmount: activeInboundAmount.div(inboundDivideBy).toString() }
  } catch (err) {
    throw err
  }
}

module.exports = getActiveFunds
