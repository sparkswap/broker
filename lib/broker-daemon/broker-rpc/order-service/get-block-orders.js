async function getBlockOrders({ params, logger, blockOrderWorker }, { GetBlockOrdersResponse }) {
    try {
        const orders = await blockOrderWorker.getBlockOrders(params.market);
        const blockOrders = orders.map(order => order.serializeSummary());
        return { blockOrders };
    }
    catch (err) {
        throw new Error(err.message);
    }
}
module.exports = getBlockOrders;
//# sourceMappingURL=get-block-orders.js.map