const createLiveStream = require('level-live-stream');
const { MarketEventOrder } = require('../../models');
const neverResolve = new Promise(() => { });
async function watchMarket({ params, send, onCancel, onError, logger, orderbooks }, { WatchMarketResponse }) {
    const { market } = params;
    const orderbook = orderbooks.get(market);
    if (!orderbook) {
        throw new Error(`${market} is not being tracked as a market.`);
    }
    const liveStream = createLiveStream(orderbook.store);
    const DB_ACTIONS = { DELETE: 'del', ADD: 'put' };
    const onData = (opts) => {
        if (opts === undefined) {
            logger.info('Undefined event in the stream, likely from a delete event');
        }
        else if (opts.sync) {
            logger.info('Sync event signifying end of old events being added to stream, following events are new');
        }
        else {
            logger.info('New event being added to stream, event info', opts);
            if (opts.type === DB_ACTIONS.DELETE) {
                params = {
                    type: WatchMarketResponse.EventType.DELETE,
                    marketEvent: { orderId: opts.key }
                };
            }
            else {
                params = {
                    type: WatchMarketResponse.EventType.ADD,
                    marketEvent: MarketEventOrder.fromStorage(opts.key, opts.value).serialize()
                };
            }
            send(new WatchMarketResponse(params));
        }
    };
    onCancel(() => liveStream.removeListener('data', onData));
    onError(() => liveStream.removeListener('data', onData));
    liveStream
        .on('data', onData);
    await neverResolve;
}
module.exports = watchMarket;
//# sourceMappingURL=watch-market.js.map