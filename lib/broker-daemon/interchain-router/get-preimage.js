const { getRecords, Big } = require('../utils');
const { Order } = require('../models');
const fromStorage = Order.fromStorage.bind(Order);
async function getRoutingEntry(ordersByHash, swapHash) {
    const range = {
        gte: swapHash,
        lte: swapHash
    };
    const orders = await getRecords(ordersByHash, fromStorage, ordersByHash.range(range));
    if (orders.length === 0) {
        throw new Error(`No routing entry available for ${swapHash}`);
    }
    if (orders.length > 1) {
        throw new Error(`Too many routing entries (${orders.length}) for ${swapHash}, only expected one.`);
    }
    const [order] = orders;
    return order;
}
function timeLockDeltaInSeconds(inboundEngine, timeLock, bestHeight) {
    const timeLockDelta = Big(timeLock).minus(bestHeight);
    if (timeLockDelta.lte(0)) {
        throw new Error(`Current block height (${bestHeight}) is higher than the extended timelock (${timeLock})`);
    }
    return timeLockDelta.times(inboundEngine.secondsPerBlock).toString();
}
async function getPreimage({ params, send, onCancel, onError, ordersByHash, engines, logger = console }) {
    const { paymentHash, symbol, amount, timeLock, bestHeight } = params;
    const swapHash = paymentHash;
    let order;
    try {
        order = await getRoutingEntry(ordersByHash, swapHash);
    }
    catch (err) {
        logger.error(err);
        return send({ permanentError: err.message });
    }
    const { inboundSymbol, inboundFillAmount, outboundSymbol, outboundFillAmount, takerAddress } = order;
    const [expectedSymbol, actualSymbol, expectedAmount, actualAmount] = [inboundSymbol, symbol, inboundFillAmount, amount];
    logger.debug(`Found routing entry for swap ${swapHash}`);
    const outboundEngine = engines.get(outboundSymbol);
    if (!outboundEngine) {
        const err = `No engine available for ${outboundSymbol}`;
        logger.error(err);
        return send({ permanentError: err });
    }
    logger.debug(`Checking outbound HTLC status for swap ${swapHash}`, { outboundSymbol });
    if (await outboundEngine.isPaymentPendingOrComplete(swapHash)) {
        logger.debug(`HTLC in progress for swap ${swapHash}, waiting for resolution`);
        const { paymentPreimage, permanentError } = await outboundEngine.getPaymentPreimage(swapHash);
        return send({ paymentPreimage, permanentError });
    }
    if (expectedSymbol !== actualSymbol) {
        const err = `Wrong currency paid in for ${swapHash}. Expected ${expectedSymbol}, found ${actualSymbol}`;
        logger.error(err);
        return send({ permanentError: err });
    }
    if (Big(expectedAmount).gt(actualAmount)) {
        const err = `Insufficient currency paid in for ${swapHash}. Expected ${expectedAmount}, found ${actualAmount}`;
        logger.error(err);
        return send({ permanentError: err });
    }
    const inboundEngine = engines.get(inboundSymbol);
    if (!inboundEngine) {
        const err = `No engine available for ${inboundSymbol}`;
        logger.error(err);
        return send({ permanentError: err });
    }
    let timeLockDelta;
    try {
        timeLockDelta = timeLockDeltaInSeconds(inboundEngine, timeLock, bestHeight);
    }
    catch (err) {
        logger.error(err);
        return send({ permanentError: err.message });
    }
    logger.debug(`Sending payment to ${takerAddress} to translate swap ${swapHash}`, { timeLockDelta, outboundFillAmount });
    const { paymentPreimage, permanentError } = await outboundEngine.translateSwap(takerAddress, swapHash, outboundFillAmount, timeLockDelta);
    logger.debug(`translateSwap returned for swap ${swapHash}`);
    if (permanentError) {
        logger.error(permanentError);
        return send({ permanentError });
    }
    logger.debug(`Successfully completed payment to ${takerAddress} for swap ${swapHash}`);
    send({ paymentPreimage });
}
module.exports = getPreimage;
//# sourceMappingURL=get-preimage.js.map