const nano = require('nano-seconds');
async function getOrderbook({ params, logger, orderbooks }, { GetOrderbookResponse }) {
    const { market } = params;
    const orderbook = orderbooks.get(market);
    if (!orderbook) {
        logger.error(`${market} is not being tracked as a market.`);
        throw new Error(`${market} is not being tracked as a market.`);
    }
    try {
        const currentTime = nano.now();
        const timestamp = nano.toString(currentTime);
        const datetime = nano.toISOString(currentTime);
        const orders = await orderbook.all();
        const bids = [];
        const asks = [];
        orders.forEach((order) => {
            const orderInfo = { price: order.price, amount: order.amount };
            if (order.side === 'BID') {
                bids.push(orderInfo);
            }
            else {
                asks.push(orderInfo);
            }
        });
        return new GetOrderbookResponse({ timestamp, datetime, bids, asks });
    }
    catch (err) {
        logger.error(`Failed to get orderbook: ${err.message}`);
        throw new Error(err);
    }
}
module.exports = getOrderbook;
//# sourceMappingURL=get-orderbook.js.map