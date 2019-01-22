const { PublicError } = require('grpc-methods');
async function newDepositAddress({ logger, params, engines }, { NewDepositAddressResponse }) {
    const { symbol } = params;
    const engine = engines.get(symbol);
    if (!engine) {
        logger.error(`Could not find engine: ${symbol}`);
        throw new PublicError(`Unable to generate address for symbol: ${symbol}`);
    }
    const address = await engine.createNewAddress();
    return new NewDepositAddressResponse({ address });
}
module.exports = newDepositAddress;
//# sourceMappingURL=new-deposit-address.js.map