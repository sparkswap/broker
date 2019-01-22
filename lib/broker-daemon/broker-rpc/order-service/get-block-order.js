const { PublicError } = require('grpc-methods');
const { BlockOrderNotFoundError } = require('../../models/errors');
async function getBlockOrder({ params, logger, blockOrderWorker }, { GetBlockOrderResponse }) {
    const { blockOrderId } = params;
    try {
        const blockOrder = await blockOrderWorker.getBlockOrder(blockOrderId);
        return blockOrder.serialize();
    }
    catch (err) {
        if (err instanceof BlockOrderNotFoundError) {
            throw new PublicError(err.message, err);
        }
        throw err;
    }
}
module.exports = getBlockOrder;
//# sourceMappingURL=get-block-order.js.map