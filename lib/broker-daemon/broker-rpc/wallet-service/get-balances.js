const { Big } = require('../../utils');
const BALANCE_PRECISION = 16;
async function getEngineBalances(symbol, engine, logger) {
    const { quantumsPerCommon } = engine;
    let [uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance] = await Promise.all([
        engine.getUncommittedBalance(),
        engine.getTotalChannelBalance(),
        engine.getTotalPendingChannelBalance(),
        engine.getUncommittedPendingBalance()
    ]);
    logger.debug(`Received balances from ${symbol} engine`, { uncommittedBalance, totalChannelBalance, totalPendingChannelBalance, uncommittedPendingBalance });
    totalChannelBalance = Big(totalChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION);
    totalPendingChannelBalance = Big(totalPendingChannelBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION);
    uncommittedBalance = Big(uncommittedBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION);
    uncommittedPendingBalance = Big(uncommittedPendingBalance).div(quantumsPerCommon).toFixed(BALANCE_PRECISION);
    return {
        uncommittedBalance,
        totalChannelBalance,
        totalPendingChannelBalance,
        uncommittedPendingBalance
    };
}
async function getBalances({ logger, engines }, { GetBalancesResponse }) {
    logger.info(`Checking wallet balances for ${engines.size} engines`);
    const enginePromises = Array.from(engines).map(async ([symbol, engine]) => {
        try {
            const balances = await getEngineBalances(symbol, engine, logger);
            return Object.assign({ symbol }, balances);
        }
        catch (e) {
            logger.error(`Failed to get engine balances for ${symbol}`, { error: e.toString() });
            return {
                symbol,
                error: e.toString()
            };
        }
    });
    const engineBalances = await Promise.all(enginePromises);
    logger.debug('Returning engine balances response', { engineBalances });
    return new GetBalancesResponse({ balances: engineBalances });
}
module.exports = getBalances;
//# sourceMappingURL=get-balances.js.map