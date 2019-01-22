const { PublicError } = require('grpc-methods');
const RELEASE_STATE = Object.freeze({
    RELEASED: 'RELEASED',
    FAILED: 'FAILED'
});
async function closeChannels(engine, symbol, force, logger) {
    try {
        const channels = await engine.closeChannels({ force });
        logger.info(`Closed ${symbol} channels`, { channels, force });
        return {
            symbol,
            status: RELEASE_STATE.RELEASED
        };
    }
    catch (e) {
        logger.error(`Failed to release channels for ${symbol}`, { force, error: e.toString() });
        return {
            symbol,
            status: RELEASE_STATE.FAILED,
            error: e.message
        };
    }
}
async function releaseChannels({ params, logger, engines, orderbooks }, { ReleaseChannelsResponse }) {
    const { market, force } = params;
    const orderbook = orderbooks.get(market);
    if (!orderbook) {
        throw new PublicError(`${market} is not being tracked as a market.`);
    }
    const [baseSymbol, counterSymbol] = market.split('/');
    const baseEngine = engines.get(baseSymbol);
    const counterEngine = engines.get(counterSymbol);
    if (!baseEngine)
        throw new PublicError(`No engine available for ${baseSymbol}`);
    if (!counterEngine)
        throw new PublicError(`No engine available for ${counterSymbol}`);
    const [base, counter] = await Promise.all([
        closeChannels(baseEngine, baseSymbol, force, logger),
        closeChannels(counterEngine, counterSymbol, force, logger)
    ]);
    return new ReleaseChannelsResponse({
        base,
        counter
    });
}
module.exports = releaseChannels;
//# sourceMappingURL=release-channels.js.map