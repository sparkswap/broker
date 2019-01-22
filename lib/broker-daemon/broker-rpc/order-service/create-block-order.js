const { PublicError } = require('grpc-methods');
async function createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce }) {
    const { amount, limitPrice, isMarketOrder, market, side, timeInForce } = params;
    if (TimeInForce[timeInForce] !== TimeInForce.GTC) {
        throw new PublicError('Only Good-til-cancelled orders are currently supported');
    }
    const blockOrderId = await blockOrderWorker.createBlockOrder({
        marketName: market,
        side: side,
        amount: amount,
        price: isMarketOrder ? null : limitPrice,
        timeInForce: 'GTC'
    });
    return new CreateBlockOrderResponse({ blockOrderId });
}
module.exports = createBlockOrder;
//# sourceMappingURL=create-block-order.js.map