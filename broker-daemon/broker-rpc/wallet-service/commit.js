const { PublicError } = require('grpc-methods')

const { convertBalance, Big } = require('../../utils')
const { currencies: currencyConfig } = require('../../config')

/**
 * Minimum funding amount in common units (e.g. 0.123 BTC)
 * @constant
 * @type {Big}
 * @default
 */
const MINIMUM_FUNDING_AMOUNT = Big(0.00400000)

/**
 * Grabs the public lightning network information from relayer and opens a channel.
 *
 * @param {Object} request - request object
 * @param {Object} request.params
 * @param {RelayerClient} request.relayer
 * @param {Engine} request.engines
 * @param {Map<String, Orderbook>} request.orderbooks
 * @param {Logger} request.logger
 * @param {Object} responses
 * @param {function} responses.EmptyResponse
 * @return {responses.EmptyResponse}
 */
async function commit ({ params, relayer, engines, orderbooks, logger }, { EmptyResponse }) {
  const { balance: balanceInCommonUnits, symbol, market } = params
  const currentCurrencyConfig = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === symbol)

  if (!currentCurrencyConfig) {
    throw new Error(`Currency was not found when trying to commit to market: ${symbol}`)
  }

  // A very archaic fee estimation amount. This number was chosen based on fees and
  // pricing of bitcoin at the current time (Dec 7 pricing $3.5k).
  //
  // As a conservative number, we would typically expect fees to be between $0.10 and $0.40
  // per on-chain transaction, so if we buffer our commitment amount by 10000sat ($0.40 usd)
  // then we should be relatively safe.
  //
  // The equivalent default for litecoin would be around 1000 litoshis
  //
  // TODO: Expose fee estimation in LND to provide a better way to estimate fees
  //       for the user
  const { feeEstimate } = currentCurrencyConfig

  if (!feeEstimate) {
    throw new Error('Currency configuration has not been setup with a fee estimate')
  }

  const orderbook = orderbooks.get(market)

  if (!orderbook) {
    throw new Error(`${market} is not being tracked as a market.`)
  }

  const { address } = await relayer.paymentChannelNetworkService.getAddress({symbol})

  const [ baseSymbol, counterSymbol ] = market.split('/')
  const inverseSymbol = (symbol === baseSymbol) ? counterSymbol : baseSymbol

  const engine = engines.get(symbol)
  const inverseEngine = engines.get(inverseSymbol)

  if (!engine) {
    logger.error(`Could not find engine: ${symbol}`)
    throw new PublicError(`No engine is configured for symbol: ${symbol}`)
  }

  if (!inverseEngine) {
    logger.error(`Could not find inverse engine: ${inverseSymbol}`)
    throw new PublicError(`No engine is configured for symbol: ${inverseSymbol}`)
  }

  const maxChannelBalance = Big(currentCurrencyConfig.maxChannelBalance)
  const balance = Big(balanceInCommonUnits).times(currentCurrencyConfig.quantumsPerCommon).toString()

  logger.info(`Attempting to create channel with ${address} on ${symbol} with ${balanceInCommonUnits}`, { balanceInCommonUnits, balance })

  // We use common units for these calculation so that we can provide
  // friendly errors to the user.
  // TODO: Get correct fee amount from engine
  if (MINIMUM_FUNDING_AMOUNT.gt(balanceInCommonUnits)) {
    throw new PublicError(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`)
  } else if (maxChannelBalance.lt(balance)) {
    logger.error(`Balance from the client exceeds maximum balance allowed (${maxChannelBalance.toString()}).`, { balance })
    throw new PublicError(`Maximum balance of ${maxChannelBalance.toString()} exceeded for committing of ${balance} to the relayer. Please try again.`)
  }

  // Get the max balance for outbound and inbound channels to see if there are already channels with the balance open. If this is the
  // case we do not need to go to the trouble of opening new channels
  const {maxBalance: maxOutboundBalance} = await engine.getMaxChannel()
  const {maxBalance: maxInboundBalance} = await inverseEngine.getMaxChannel({outbound: false})
  const convertedBalance = convertBalance(balance, symbol, inverseSymbol)

  // If maxOutboundBalance or maxInboundBalance exist, we need to check if the balances are greater or less than the balance of the channel
  // we are trying to open. If neither maxOutboundBalance nor maxInboundBalance exist, it means there are no channels open and we can safely
  // attempt to create channels with the balance
  if (maxOutboundBalance || maxInboundBalance) {
    const insufficientOutboundBalance = maxOutboundBalance && Big(maxOutboundBalance).lt(balance)
    const insufficientInboundBalance = maxInboundBalance && Big(maxInboundBalance).lt(convertedBalance)

    let errorMessage

    if (insufficientOutboundBalance) {
      errorMessage = 'You have another outbound channel open with a balance lower than desired, release that channel and try again.'
    } else if (insufficientInboundBalance) {
      errorMessage = 'You have another inbound channel open with a balance lower than desired, release that channel and try again.'
    } else {
      errorMessage = `You already have a channel open with ${balanceInCommonUnits} or greater.`
    }

    logger.error(errorMessage, { balance, maxOutboundBalance, maxInboundBalance, inboundBalance: convertedBalance })
    throw new PublicError(errorMessage)
  }

  logger.debug('Creating outbound channel', { address, balance, feeEstimate })

  // We remove fees from the balance to make sure that the user has enough funds
  // for the open/close channel transactions
  const balanceWithFeeEstimate = Big(balance).minus(feeEstimate).toString()

  try {
    await engine.createChannel(address, balanceWithFeeEstimate)
  } catch (e) {
    logger.error('Received error when creating outbound channel', { error: e.stack })
    throw new PublicError(`Funding error: Check that you have sufficient balance`)
  }

  const paymentChannelNetworkAddress = await inverseEngine.getPaymentChannelNetworkAddress()

  try {
    logger.debug('Requesting inbound channel from relayer', { address: paymentChannelNetworkAddress, balance: convertBalance, symbol: inverseSymbol })
    await relayer.paymentChannelNetworkService.createChannel({address: paymentChannelNetworkAddress, balance: convertedBalance, symbol: inverseSymbol})
  } catch (e) {
    // If the relayer call fails, the user can simply try and open channels again
    // on the same market. We handle this undesired state above where we check the
    // current status of channels and repair them if necessary.
    throw new PublicError(`Funding error: Relayer is unavailable, Please try again`)
  }

  return new EmptyResponse({})
}

module.exports = commit
