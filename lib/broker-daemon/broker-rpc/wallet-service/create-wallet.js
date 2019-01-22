const { PublicError } = require('grpc-methods');
async function createWallet({ logger, params, engines }, { CreateWalletResponse }) {
    const { symbol, password } = params;
    const engine = engines.get(symbol);
    if (!engine) {
        logger.error(`Could not find engine: ${symbol}`);
        throw new PublicError(`Unable to create wallet for engine: ${symbol}`);
    }
    const recoverySeed = await engine.createWallet(password);
    engine.validateEngine();
    return new CreateWalletResponse({ recoverySeed });
}
module.exports = createWallet;
//# sourceMappingURL=create-wallet.js.map