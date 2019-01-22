const { currencies } = require('../../config');
const { Big } = require('../../utils');
const SIDES = Object.freeze({
    BID: 'BID',
    ASK: 'ASK'
});
const CAPACITY_STATE = Object.freeze({
    OK: 'OK',
    FAILED: 'FAILED'
});
async function getCapacities(engine, symbol, outstandingSendCapacity, outstandingReceiveCapacity, { logger }) {
    const { quantumsPerCommon } = currencies.find(({ symbol: configSymbol }) => configSymbol === symbol) || {};
    if (!quantumsPerCommon) {
        throw new Error(`Currency was not found when trying to get trading capacities: ${this.symbol}`);
    }
    try {
        const [openChannelCapacities, pendingChannelCapacities] = await Promise.all([
            engine.getOpenChannelCapacities(),
            engine.getPendingChannelCapacities()
        ]);
        const { active: activeChannelCapacities, inactive: inactiveChannelCapacities } = openChannelCapacities;
        return {
            symbol,
            status: CAPACITY_STATE.OK,
            availableReceiveCapacity: Big(activeChannelCapacities.remoteBalance).minus(outstandingReceiveCapacity).div(quantumsPerCommon).toString(),
            availableSendCapacity: Big(activeChannelCapacities.localBalance).minus(outstandingSendCapacity).div(quantumsPerCommon).toString(),
            pendingSendCapacity: Big(pendingChannelCapacities.localBalance).div(quantumsPerCommon).toString(),
            pendingReceiveCapacity: Big(pendingChannelCapacities.remoteBalance).div(quantumsPerCommon).toString(),
            inactiveSendCapacity: Big(inactiveChannelCapacities.localBalance).div(quantumsPerCommon).toString(),
            inactiveReceiveCapacity: Big(inactiveChannelCapacities.remoteBalance).div(quantumsPerCommon).toString(),
            outstandingReceiveCapacity: Big(outstandingReceiveCapacity).div(quantumsPerCommon).toString(),
            outstandingSendCapacity: Big(outstandingSendCapacity).div(quantumsPerCommon).toString()
        };
    }
    catch (e) {
        logger.debug(`Received error when trying to get engine capacities for ${symbol}`, { outstandingReceiveCapacity, outstandingSendCapacity });
        return {
            symbol,
            status: CAPACITY_STATE.FAILED,
            error: e.message
        };
    }
}
async function getTradingCapacities({ params, engines, orderbooks, blockOrderWorker, logger }, { GetTradingCapacitiesResponse }) {
    const { market } = params;
    const orderbook = orderbooks.get(market);
    if (!orderbook) {
        throw new Error(`${market} is not being tracked as a market.`);
    }
    const [baseSymbol, counterSymbol] = market.split('/');
    const baseEngine = engines.get(baseSymbol);
    if (!baseEngine) {
        throw new Error(`No engine available for ${baseSymbol}`);
    }
    const counterEngine = engines.get(counterSymbol);
    if (!counterEngine) {
        throw new Error(`No engine available for ${counterSymbol}`);
    }
    logger.debug(`Calculating active funds for ${market}`);
    const [{ activeOutboundAmount: committedCounterSendCapacity, activeInboundAmount: committedBaseReceiveCapacity }, { activeOutboundAmount: committedBaseSendCapacity, activeInboundAmount: committedCounterReceiveCapacity }] = await Promise.all([
        blockOrderWorker.calculateActiveFunds(market, SIDES.BID),
        blockOrderWorker.calculateActiveFunds(market, SIDES.ASK)
    ]);
    const [baseSymbolCapacities, counterSymbolCapacities] = await Promise.all([
        getCapacities(baseEngine, baseSymbol, committedBaseSendCapacity, committedBaseReceiveCapacity, { logger }),
        getCapacities(counterEngine, counterSymbol, committedCounterSendCapacity, committedCounterReceiveCapacity, { logger })
    ]);
    logger.debug(`Received capacities for market ${market}`, { baseSymbolCapacities, counterSymbolCapacities });
    return new GetTradingCapacitiesResponse({ baseSymbolCapacities, counterSymbolCapacities });
}
module.exports = getTradingCapacities;
//# sourceMappingURL=get-trading-capacities.js.map