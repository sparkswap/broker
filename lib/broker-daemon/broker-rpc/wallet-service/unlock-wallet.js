const { PublicError } = require('grpc-methods');
async function unlockWallet({ logger, params, engines }, { EmptyResponse }) {
    const { symbol, password } = params;
    const engine = engines.get(symbol);
    if (!engine) {
        logger.error(`Could not find engine: ${symbol}`);
        throw new PublicError(`Unable to unlock wallet. No engine available for ${symbol}`);
    }
    if (!engine.isLocked) {
        logger.error(`Engine for ${symbol} is not locked. Current status: ${engine.status}`);
        throw new PublicError(`Unable to unlock wallet, engine for ${symbol} is currently: ${engine.status}`);
    }
    await engine.unlockWallet(password);
    return new EmptyResponse({});
}
module.exports = unlockWallet;
//# sourceMappingURL=unlock-wallet.js.map