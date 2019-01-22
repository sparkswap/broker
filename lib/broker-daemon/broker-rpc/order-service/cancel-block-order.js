const { PublicError } = require('grpc-methods');
const { BlockOrderNotFoundError } = require('../../models/errors');
async function cancelBlockOrder({ params, logger, blockOrderWorker }) {
    const { blockOrderId } = params;
    try {
        await blockOrderWorker.cancelBlockOrder(blockOrderId);
        return {};
    }
    catch (err) {
        if (err instanceof BlockOrderNotFoundError) {
            throw new PublicError(err.message, err);
        }
        throw err;
    }
}
module.exports = cancelBlockOrder;
//# sourceMappingURL=cancel-block-order.js.map