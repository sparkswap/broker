const { MarketEvent } = require('../../models');
const { Big } = require('../../utils');
const DEFAULT_LIMIT = Big(50);
async function getTrades({ params, logger, orderbooks }, { GetTradesResponse }) {
    try {
        const { market, since } = params;
        const orderbook = orderbooks.get(market.toUpperCase());
        if (!orderbook) {
            logger.error(`${market} is not being tracked as a market.`);
            throw new Error(`${market} is not being tracked as a market.`);
        }
        const limit = (params.limit === '0' || params.limit === undefined) ? DEFAULT_LIMIT : Big(params.limit);
        logger.info(`Fetching trades for ${market} since ${since}, limit: ${limit}`);
        const trades = await orderbook.getTrades(since, limit);
        logger.info(`Formatting trades for ${market} since ${since}, limit: ${limit}`);
        const formattedTrades = trades.filter(trade => trade.eventType === MarketEvent.TYPES.FILLED).map(t => t.tradeInfo(market));
        return new GetTradesResponse({ trades: formattedTrades });
    }
    catch (err) {
        logger.error('Received error when grabbing trades', { error: err.stack });
        throw new Error(err.message);
    }
}
module.exports = getTrades;
//# sourceMappingURL=get-trades.js.map