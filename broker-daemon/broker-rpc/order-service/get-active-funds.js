const { currencies } = require('../../config')
const Order = require('../../models/order')
const { Big } = require('../../utils')

/**
 * Gets the active funds for the currencies on the given market taking the side into consideration
 *
 * @param {GrpcUnaryMethod~request} request - request object
 * @param {Object} request.params - Request parameters from the client
 * @param {BlockOrderWorker} request.blockOrderWorker
 * @param {Object} request.logger
 * @param {function} responses.GetActiveFundsResponse
 * @return {GetActiveFundsResponse}
 */
async function getActiveFunds ({ params, logger, blockOrderWorker }, { GetActiveFundsResponse }) {
  const {
    market,
    side
  } = params

  try {
    const { activeOutboundAmount, activeInboundAmount } = await blockOrderWorker.calculateActiveFunds(market, side)
    const [baseSymbol, counterSymbol] = market.split('/')

    const outboundSymbol = side === Order.SIDES.BID ? counterSymbol : baseSymbol
    const inboundSymbol = side === Order.SIDES.BID ? baseSymbol : counterSymbol

    const outboundDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === outboundSymbol).quantumsPerCommon
    const inboundDivideBy = currencies.find(({ symbol: configSymbol }) => configSymbol === inboundSymbol).quantumsPerCommon

    return new GetActiveFundsResponse({
      activeOutboundAmount: Big(activeOutboundAmount).div(outboundDivideBy).toString(),
      activeInboundAmount: Big(activeInboundAmount).div(inboundDivideBy).toString()
    })
  } catch (err) {
    throw err
  }
}

module.exports = getActiveFunds
