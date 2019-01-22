const { PublicError } = require('grpc-methods');
const { currencies } = require('../../config');
const { Big } = require('../../utils');
async function withdrawFunds({ params, relayer, logger, engines }, { WithdrawFundsResponse }) {
    const { symbol, amount, address } = params;
    const engine = engines.get(symbol);
    if (!engine) {
        throw new PublicError(`No engine available for ${symbol}`);
    }
    const { quantumsPerCommon: multiplier } = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol) || {};
    if (!multiplier) {
        throw new PublicError(`Invalid configuration: missing quantumsPerCommon for ${symbol}`);
    }
    const amountInSat = Big(amount).times(multiplier);
    try {
        logger.info(`Attempting to withdraw ${amount} ${symbol} from wallet to ${address}`);
        const txid = await engine.withdrawFunds(address, amountInSat.toString());
        logger.info(`Successfully withdrew ${amount} ${symbol} from wallet to ${address}, transaction id: ${txid}`);
        return new WithdrawFundsResponse({ txid });
    }
    catch (err) {
        throw new PublicError(err.message, err);
    }
}
module.exports = withdrawFunds;
//# sourceMappingURL=withdraw-funds.js.map