const nano = require('nano-seconds');
const { PublicError } = require('grpc-methods');
const { BlockOrder, MarketEvent } = require('../../models');
const { Big } = require('../../utils');
const MarketStats = require('./market-stats');
const ONE_DAY_IN_NANOSECONDS = Big('86400000000000');
async function getMarketStats({ params, logger, orderbooks }, { GetMarketStatsResponse }) {
    const { market } = params;
    const orderbook = orderbooks.get(market);
    if (!orderbook)
        throw new PublicError(`${market} is not being tracked as a market.`);
    logger.debug(`Checking currency configurations for: ${market}`);
    const stats = new MarketStats(market);
    const currentTime = nano.now();
    const timestamp = nano.toString(currentTime);
    const datetime = nano.toISOString(currentTime);
    logger.debug('Grabbing data from orderbook');
    const startTime = Big(timestamp).minus(ONE_DAY_IN_NANOSECONDS);
    const currentOrderbookEvents = await orderbook.getOrderbookEventsByTimestamp(startTime);
    const currentMarketEvents = await orderbook.getMarketEventsByTimestamp(startTime);
    logger.debug(`Generating market report for ${market}`, { currentTime });
    const currentAsks = currentOrderbookEvents.filter(e => e.side === BlockOrder.SIDES.ASK);
    const bestAskPrice = await stats.lowestPrice(currentAsks);
    const bestAskAmount = await stats.bestAskAmount(currentAsks);
    const currentBids = currentOrderbookEvents.filter(e => e.side === BlockOrder.SIDES.BID);
    const bestBidPrice = await stats.highestPrice(currentBids);
    const bestBidAmount = await stats.bestBidAmount(currentBids);
    const filledMarketEvents = currentMarketEvents.filter(e => e.eventType === MarketEvent.TYPES.FILLED);
    const highestPrice = await stats.highestPrice(filledMarketEvents);
    const lowestPrice = await stats.lowestPrice(filledMarketEvents);
    const vwap = await stats.vwap(filledMarketEvents);
    const totalBase = await stats.baseVolume(filledMarketEvents);
    const totalCounter = await stats.counterVolume(filledMarketEvents);
    return new GetMarketStatsResponse({
        symbol: market,
        timestamp,
        datetime,
        high: highestPrice.toString(),
        low: lowestPrice.toString(),
        ask: bestAskPrice.toString(),
        askVolume: bestAskAmount.toString(),
        bid: bestBidPrice.toString(),
        bidVolume: bestBidAmount.toString(),
        vwap: vwap.toString(),
        baseVolume: totalBase.toString(),
        counterVolume: totalCounter.toString()
    });
}
module.exports = getMarketStats;
//# sourceMappingURL=get-market-stats.js.map