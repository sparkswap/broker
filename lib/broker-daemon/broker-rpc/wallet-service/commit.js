const { PublicError } = require('grpc-methods');
const { convertBalance, Big } = require('../../utils');
const MINIMUM_FUNDING_AMOUNT = Big(0.00400000);
async function commit({ params, relayer, logger, engines, orderbooks }, { EmptyResponse }) {
    const { balance: balanceCommon, symbol, market } = params;
    const orderbook = orderbooks.get(market);
    if (!orderbook) {
        throw new Error(`${market} is not being tracked as a market.`);
    }
    const { address } = await relayer.paymentChannelNetworkService.getAddress({ symbol });
    const [baseSymbol, counterSymbol] = market.split('/');
    const inverseSymbol = (symbol === baseSymbol) ? counterSymbol : baseSymbol;
    const engine = engines.get(symbol);
    const inverseEngine = engines.get(inverseSymbol);
    if (!engine) {
        logger.error(`Could not find engine: ${symbol}`);
        throw new PublicError(`No engine is configured for symbol: ${symbol}`);
    }
    if (!inverseEngine) {
        logger.error(`Could not find inverse engine: ${inverseSymbol}`);
        throw new PublicError(`No engine is configured for symbol: ${inverseSymbol}`);
    }
    const maxChannelBalance = Big(engine.maxChannelBalance);
    const balance = Big(balanceCommon).times(engine.quantumsPerCommon).toString();
    logger.info(`Attempting to create channel with ${address} on ${symbol} with ${balanceCommon}`, {
        balanceCommon,
        balance
    });
    if (MINIMUM_FUNDING_AMOUNT.gt(balanceCommon)) {
        throw new PublicError(`Minimum balance of ${MINIMUM_FUNDING_AMOUNT} needed to commit to the relayer`);
    }
    else if (maxChannelBalance.lt(balance)) {
        const maxChannelBalanceCommon = Big(maxChannelBalance).div(engine.quantumsPerCommon).toString();
        logger.error(`Balance from the client exceeds maximum balance allowed (${maxChannelBalance.toString()}).`, { balance });
        throw new PublicError(`Maximum balance of ${maxChannelBalanceCommon} ${symbol} exceeded for ` +
            `committing of ${balanceCommon} ${symbol} to the Relayer. Please try again.`);
    }
    const convertedBalance = convertBalance(balance, symbol, inverseSymbol);
    const convertedMaxChannelBalance = Big(inverseEngine.maxChannelBalance);
    if (convertedMaxChannelBalance.lt(convertedBalance)) {
        const convertedBalanceCommon = Big(convertedBalance).div(inverseEngine.quantumsPerCommon).toString();
        const convertedMaxChannelBalanceCommon = Big(convertedMaxChannelBalance).div(inverseEngine.quantumsPerCommon).toString();
        logger.error(`Balance in desired inbound channel exceeds maximum balance allowed (${convertedMaxChannelBalance.toString()}).`, { convertedBalance });
        throw new PublicError(`Maximum balance of ${convertedMaxChannelBalanceCommon} ${inverseSymbol} exceeded for ` +
            `requesting inbound channel of ${convertedBalanceCommon} ${inverseSymbol} from the Relayer. Please try again.`);
    }
    const { maxBalance: maxOutboundBalance } = await engine.getMaxChannel();
    const { maxBalance: maxInboundBalance } = await inverseEngine.getMaxChannel({ outbound: false });
    if (maxOutboundBalance || maxInboundBalance) {
        const insufficientOutboundBalance = maxOutboundBalance && Big(maxOutboundBalance).lt(balance);
        const insufficientInboundBalance = maxInboundBalance && Big(maxInboundBalance).lt(convertedBalance);
        let errorMessage;
        if (insufficientOutboundBalance) {
            errorMessage = 'You have another outbound channel open with a balance lower than desired, release that channel and try again.';
        }
        else if (insufficientInboundBalance) {
            errorMessage = 'You have another inbound channel open with a balance lower than desired, release that channel and try again.';
        }
        else {
            errorMessage = `You already have a channel open with ${balanceCommon} or greater.`;
        }
        logger.error(errorMessage, { balance, maxOutboundBalance, maxInboundBalance, inboundBalance: convertedBalance });
        throw new PublicError(errorMessage);
    }
    logger.debug('Creating outbound channel', { address, balance });
    try {
        await engine.createChannel(address, balance);
    }
    catch (e) {
        logger.error('Received error when creating outbound channel', { error: e.stack });
        throw new PublicError(`Funding error: ${e.message}`);
    }
    const paymentChannelNetworkAddress = await inverseEngine.getPaymentChannelNetworkAddress();
    try {
        logger.debug('Requesting inbound channel from relayer', { address: paymentChannelNetworkAddress, balance: convertBalance, symbol: inverseSymbol });
        await relayer.paymentChannelNetworkService.createChannel({ address: paymentChannelNetworkAddress, balance: convertedBalance, symbol: inverseSymbol });
    }
    catch (e) {
        throw (e);
    }
    return new EmptyResponse({});
}
module.exports = commit;
//# sourceMappingURL=commit.js.map