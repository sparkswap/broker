const EventEmitter = require('events');
const { promisify } = require('util');
const { BlockOrder, Order, Fill } = require('../models');
const { OrderStateMachine, FillStateMachine } = require('../state-machines');
const { Big, getRecords, SublevelIndex, generateId } = require('../utils');
class BlockOrderWorker extends EventEmitter {
    constructor({ orderbooks, store, logger, relayer, engines }) {
        super();
        this.orderbooks = orderbooks;
        this.store = store;
        this.ordersStore = store.sublevel('orders');
        this.fillsStore = store.sublevel('fills');
        this.logger = logger;
        this.relayer = relayer;
        this.engines = engines;
        const filterOrdersWithHash = (key, value) => !!Order.fromStorage(key, value).swapHash;
        const getHashFromOrder = (key, value) => Order.fromStorage(key, value).swapHash;
        const filterOrdersWithOrderId = (key, value) => !!Order.fromStorage(key, value).orderId;
        const getOrderIdFromOrder = (key, value) => Order.fromStorage(key, value).orderId;
        this.ordersByHash = new SublevelIndex(this.ordersStore, 'ordersByHash', getHashFromOrder, filterOrdersWithHash);
        this.ordersByOrderId = new SublevelIndex(this.ordersStore, 'ordersByOrderId', getOrderIdFromOrder, filterOrdersWithOrderId);
    }
    async initialize() {
        await this.ordersByHash.ensureIndex();
        await this.ordersByOrderId.ensureIndex();
        await this.settleIndeterminateOrdersFills();
    }
    async settleIndeterminateOrdersFills() {
        const blockOrders = await getRecords(this.store, BlockOrder.fromStorage.bind(BlockOrder));
        for (let blockOrder of blockOrders) {
            const orderStateMachines = await this.getOrderStateMachines(blockOrder);
            orderStateMachines.filter((osm) => Object.values(OrderStateMachine.INDETERMINATE_STATES).includes(osm.state)).forEach((osm) => {
                this.applyOsmListeners(osm, blockOrder);
                osm.triggerState();
            });
            const fillStateMachines = await this.getFillStateMachines(blockOrder);
            fillStateMachines.filter((fsm) => Object.values(FillStateMachine.INDETERMINATE_STATES).includes(fsm.state)).forEach((fsm) => {
                this.applyFsmListeners(fsm, blockOrder);
                fsm.triggerState();
            });
        }
    }
    async getOrderStateMachines(blockOrder) {
        const osms = await getRecords(this.ordersStore, (key, value) => {
            return OrderStateMachine.fromStore({
                store: this.ordersStore,
                logger: this.logger,
                relayer: this.relayer,
                engines: this.engines
            }, {
                key,
                value
            });
        }, Order.rangeForBlockOrder(blockOrder.id));
        return osms;
    }
    async getFillStateMachines(blockOrder) {
        const fsms = await getRecords(this.fillsStore, (key, value) => {
            return FillStateMachine.fromStore({
                store: this.fillsStore,
                logger: this.logger,
                relayer: this.relayer,
                engines: this.engines
            }, {
                key,
                value
            });
        }, Fill.rangeForBlockOrder(blockOrder.id));
        return fsms;
    }
    async createBlockOrder({ marketName, side, amount, price, timeInForce }) {
        const id = generateId();
        const orderbook = this.orderbooks.get(marketName);
        if (!orderbook) {
            throw new Error(`${marketName} is not being tracked as a market. Configure sparkswapd to track ${marketName} using the MARKETS environment variable.`);
        }
        if (!this.engines.has(orderbook.baseSymbol)) {
            throw new Error(`No engine available for ${orderbook.baseSymbol}.`);
        }
        if (!this.engines.has(orderbook.counterSymbol)) {
            throw new Error(`No engine available for ${orderbook.counterSymbol}.`);
        }
        const blockOrder = new BlockOrder({ id, marketName, side, amount, price, timeInForce });
        await this.checkFundsAreSufficient(blockOrder);
        await promisify(this.store.put)(blockOrder.key, blockOrder.value);
        this.logger.info(`Created and stored block order`, { blockOrderId: blockOrder.id });
        this.workBlockOrder(blockOrder, Big(blockOrder.baseAmount)).catch(err => {
            this.failBlockOrder(blockOrder.id, err);
        });
        return id;
    }
    async checkFundsAreSufficient(blockOrder) {
        const { marketName, side, outboundSymbol, inboundSymbol } = blockOrder;
        const { activeOutboundAmount, activeInboundAmount } = await this.calculateActiveFunds(marketName, side);
        const outboundEngine = this.engines.get(outboundSymbol);
        const inboundEngine = this.engines.get(inboundSymbol);
        if (!outboundEngine) {
            throw new Error(`No engine available for ${outboundSymbol}.`);
        }
        if (!inboundEngine) {
            throw new Error(`No engine available for ${inboundSymbol}.`);
        }
        const [{ address: outboundAddress }, { address: inboundAddress }] = await Promise.all([
            this.relayer.paymentChannelNetworkService.getAddress({ symbol: outboundSymbol }),
            this.relayer.paymentChannelNetworkService.getAddress({ symbol: inboundSymbol })
        ]);
        let counterAmount;
        let outboundAmount;
        let inboundAmount;
        if (blockOrder.isMarketOrder) {
            const orderbook = this.orderbooks.get(blockOrder.marketName);
            if (!orderbook) {
                throw new Error(`${blockOrder.marketName} is not being tracked as a market. Configure sparkswapd to track ${blockOrder.marketName} using the MARKETS environment variable.`);
            }
            const averagePrice = await orderbook.getAveragePrice(blockOrder.inverseSide, blockOrder.baseAmount);
            counterAmount = averagePrice.times(blockOrder.amount).times(blockOrder.counterCurrencyConfig.quantumsPerCommon).round(0).toString();
            if (blockOrder.isBid) {
                outboundAmount = counterAmount;
                inboundAmount = blockOrder.baseAmount;
            }
            else {
                outboundAmount = blockOrder.baseAmount;
                inboundAmount = counterAmount;
            }
        }
        else {
            outboundAmount = blockOrder.outboundAmount;
            inboundAmount = blockOrder.inboundAmount;
        }
        const outboundBalanceIsSufficient = await outboundEngine.isBalanceSufficient(outboundAddress, Big(outboundAmount).plus(activeOutboundAmount));
        if (!outboundBalanceIsSufficient) {
            throw new Error(`Insufficient funds in outbound ${blockOrder.outboundSymbol} channel to create order`);
        }
        const inboundBalanceIsSufficient = await inboundEngine.isBalanceSufficient(inboundAddress, Big(inboundAmount).plus(activeInboundAmount), { outbound: false });
        if (!inboundBalanceIsSufficient) {
            throw new Error(`Insufficient funds in inbound ${blockOrder.inboundSymbol} channel to create order`);
        }
    }
    async calculateActiveFunds(marketName, side) {
        const blockOrders = await this.getBlockOrders(marketName);
        const blockOrdersForSide = blockOrders.filter(blockOrder => blockOrder.side === side);
        let activeOutboundAmount = Big(0);
        let activeInboundAmount = Big(0);
        for (let blockOrder of blockOrdersForSide) {
            await blockOrder.populateOrders(this.ordersStore);
            await blockOrder.populateFills(this.fillsStore);
            activeOutboundAmount = activeOutboundAmount.plus(blockOrder.activeOutboundAmount());
            activeInboundAmount = activeInboundAmount.plus(blockOrder.activeInboundAmount());
        }
        return { activeOutboundAmount, activeInboundAmount };
    }
    async getBlockOrder(blockOrderId) {
        this.logger.info('Getting block order', { id: blockOrderId });
        const blockOrder = await BlockOrder.fromStore(this.store, blockOrderId);
        await Promise.all([
            blockOrder.populateOrders(this.ordersStore),
            blockOrder.populateFills(this.fillsStore)
        ]);
        return blockOrder;
    }
    async cancelOutstandingOrders(blockOrder) {
        await blockOrder.populateOrders(this.ordersStore);
        this.logger.info(`Found ${blockOrder.orders.length} orders associated with Block Order ${blockOrder.id}`);
        const openOrders = blockOrder.openOrders;
        this.logger.info(`Found ${openOrders.length} orders in a state to be cancelled for Block order ${blockOrder.id}`);
        await Promise.all(openOrders.map(({ order }) => {
            const orderId = order.orderId;
            const authorization = this.relayer.identity.authorize(orderId);
            this.logger.debug(`Generated authorization for ${orderId}`, authorization);
            return this.relayer.makerService.cancelOrder({ orderId, authorization });
        }));
        this.logger.info(`Cancelled ${openOrders.length} underlying orders for ${blockOrder.id}`);
    }
    async cancelBlockOrder(blockOrderId) {
        this.logger.info('Cancelling block order ', { id: blockOrderId });
        const blockOrder = await BlockOrder.fromStore(this.store, blockOrderId);
        try {
            await this.cancelOutstandingOrders(blockOrder);
        }
        catch (e) {
            this.logger.error('Failed to cancel all orders for block order: ', { blockOrderId: blockOrder.id, error: e });
            blockOrder.fail();
            await promisify(this.store.put)(blockOrder.key, blockOrder.value);
            throw e;
        }
        blockOrder.cancel();
        await promisify(this.store.put)(blockOrder.key, blockOrder.value);
        this.logger.info('Moved block order to cancelled state', { id: blockOrder.id });
        return blockOrder;
    }
    async getBlockOrders(market) {
        this.logger.info(`Getting all block orders for market: ${market}`);
        const allRecords = await getRecords(this.store, BlockOrder.fromStorage.bind(BlockOrder));
        const recordsForMarket = allRecords.filter((record) => record.marketName === market);
        return recordsForMarket;
    }
    async failBlockOrder(blockOrderId, err) {
        this.logger.error('Error encountered while working block', { id: blockOrderId, error: err.stack });
        this.logger.info('Moving block order to failed state', { id: blockOrderId });
        const blockOrder = await BlockOrder.fromStore(this.store, blockOrderId);
        try {
            await this.cancelOutstandingOrders(blockOrder);
        }
        catch (e) {
            this.logger.error('Failed to cancel all orders for block order: ', { blockOrderId: blockOrder.id, error: e });
        }
        blockOrder.fail();
        await promisify(this.store.put)(blockOrder.key, blockOrder.value);
        this.logger.info('Moved block order to failed state', { id: blockOrderId });
    }
    async workBlockOrder(blockOrder, targetDepth) {
        this.logger.info('Working block order', { blockOrderId: blockOrder.id });
        if (!blockOrder.isInWorkableState) {
            this.logger.info('BlockOrder is not in a state to be worked', { blockOrderId: blockOrder.id });
            return;
        }
        const orderbook = this.orderbooks.get(blockOrder.marketName);
        if (!orderbook) {
            throw new Error(`No orderbook is initialized for created order in the ${blockOrder.marketName} market.`);
        }
        if (blockOrder.isMarketOrder) {
            await this.workMarketBlockOrder(blockOrder, targetDepth);
        }
        else {
            await this.workLimitBlockOrder(blockOrder, targetDepth);
        }
    }
    async workMarketBlockOrder(blockOrder, targetDepth) {
        const orderbook = this.orderbooks.get(blockOrder.marketName);
        const { orders, depth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString() });
        if (Big(depth).lt(targetDepth)) {
            this.logger.error(`Insufficient depth in ${blockOrder.inverseSide} to fill ${targetDepth.toString()}`, { depth, targetDepth });
            throw new Error(`Insufficient depth in ${blockOrder.inverseSide} to fill ${targetDepth.toString()}`);
        }
        return this._fillOrders(blockOrder, orders, targetDepth.toString());
    }
    async workLimitBlockOrder(blockOrder, targetDepth) {
        if (blockOrder.timeInForce !== BlockOrder.TIME_RESTRICTIONS.GTC) {
            throw new Error('Only Good-til-cancelled limit orders are currently supported.');
        }
        const orderbook = this.orderbooks.get(blockOrder.marketName);
        const { orders, depth: availableDepth } = await orderbook.getBestOrders({ side: blockOrder.inverseSide, depth: targetDepth.toString(), quantumPrice: blockOrder.quantumPrice });
        await this._fillOrders(blockOrder, orders, targetDepth.toString());
        if (targetDepth.gt(availableDepth)) {
            this._placeOrders(blockOrder, targetDepth.minus(availableDepth).toString());
        }
    }
    async checkBlockOrderCompletion(blockOrderId) {
        this.logger.info('Attempting to put block order in a completed state', { id: blockOrderId });
        const blockOrder = await this.getBlockOrder(blockOrderId);
        let totalFilled = Big(0);
        totalFilled = blockOrder.fills.reduce((acc, fsm) => acc.plus(fsm.fill.fillAmount), totalFilled);
        totalFilled = blockOrder.orders.reduce((acc, osm) => {
            return acc.plus(osm.order.fillAmount || 0);
        }, totalFilled);
        this.logger.debug('Current total filled amount: ', { totalFilled, blockOrderAmount: blockOrder.baseAmount });
        const stillBeingFilled = totalFilled.lt(blockOrder.baseAmount);
        if (!stillBeingFilled) {
            blockOrder.complete();
            await promisify(this.store.put)(blockOrder.key, blockOrder.value);
            this.logger.info('Moved block order to completed state', { blockOrderId });
        }
        else {
            this.logger.debug('Block order is not ready to be completed', { blockOrderId });
        }
    }
    applyOsmListeners(osm, blockOrder) {
        osm.once('complete', async () => {
            try {
                await this.checkBlockOrderCompletion(blockOrder.id);
            }
            catch (e) {
                this.logger.error(`BlockOrder failed to be completed from order`, { id: blockOrder.id, error: e.stack });
            }
            osm.removeAllListeners();
        });
        osm.once('before:execute', async () => {
            this.logger.debug(`Order ${osm.order.orderId} has been filled, re-placing the remainder`);
            try {
                const remainingBaseAmount = Big(osm.order.baseAmount).minus(osm.order.fillAmount);
                if (remainingBaseAmount.gt(0)) {
                    this.logger.debug(`Re-placing an order for ${remainingBaseAmount.toString()} for Block Order ${blockOrder.id}`);
                    await this.workBlockOrder(blockOrder, remainingBaseAmount);
                }
            }
            catch (e) {
                this.failBlockOrder(blockOrder.id, e);
            }
        });
        osm.once('reject', async () => {
            try {
                await this.failBlockOrder(blockOrder.id, osm.order.error);
            }
            catch (e) {
                this.logger.error(`BlockOrder failed on setting a failed status from order`, { id: blockOrder.id, error: e.stack });
            }
            osm.removeAllListeners();
        });
        osm.once('cancel', async () => {
            osm.removeAllListeners();
        });
        return osm;
    }
    _placeOrders(blockOrder, baseAmount) {
        const { baseSymbol, counterSymbol, quantumPrice } = blockOrder;
        const baseEngine = this.engines.get(baseSymbol);
        const counterEngine = this.engines.get(counterSymbol);
        if (!baseEngine) {
            throw new Error(`No engine available for ${baseSymbol}`);
        }
        if (!counterEngine) {
            throw new Error(`No engine available for ${counterSymbol}`);
        }
        const baseMaxPayment = baseEngine.maxPaymentSize;
        const counterMaxPayment = counterEngine.maxPaymentSize;
        const maxPaymentSizeImpliedPrice = Big(counterMaxPayment).div(baseMaxPayment);
        let maxBaseAmountPerOrder;
        if (Big(quantumPrice).gte(maxPaymentSizeImpliedPrice)) {
            maxBaseAmountPerOrder = Big(counterMaxPayment).div(quantumPrice).round(0);
        }
        else {
            maxBaseAmountPerOrder = Big(baseMaxPayment);
        }
        let baseAmountRemaining = Big(baseAmount);
        let orderCount = 1;
        while (baseAmountRemaining.gt(0)) {
            this.logger.info(`Placing order #${orderCount++} for BlockOrder`, { blockOrderId: blockOrder.id });
            let orderBaseAmount = baseAmountRemaining;
            if (orderBaseAmount.gte(maxBaseAmountPerOrder)) {
                orderBaseAmount = maxBaseAmountPerOrder;
            }
            this._placeOrder(blockOrder, orderBaseAmount.toString());
            baseAmountRemaining = baseAmountRemaining.minus(orderBaseAmount);
        }
    }
    async _placeOrder(blockOrder, baseAmount) {
        const { baseSymbol, counterSymbol, side, quantumPrice } = blockOrder;
        const counterAmount = Big(baseAmount).times(quantumPrice).round(0).toString();
        const { relayer, engines, logger } = this;
        const store = this.ordersStore;
        this.logger.info('Creating order for BlockOrder', { baseAmount, side, blockOrderId: blockOrder.id });
        const osm = await OrderStateMachine.create({
            relayer,
            engines,
            logger,
            store
        }, blockOrder.id, { side, baseSymbol, counterSymbol, baseAmount, counterAmount });
        this.applyOsmListeners(osm, blockOrder);
        this.logger.info('Created order for BlockOrder', { blockOrderId: blockOrder.id, orderId: osm.order.orderId });
    }
    async _fillOrders(blockOrder, orders, targetDepth) {
        this.logger.info(`Filling ${orders.length} orders for ${blockOrder.id} up to depth of ${targetDepth}`);
        targetDepth = Big(targetDepth);
        let currentDepth = Big('0');
        const { relayer, engines, logger } = this;
        const store = this.fillsStore;
        const { baseSymbol, counterSymbol } = blockOrder;
        if (!engines.has(baseSymbol)) {
            throw new Error(`No engine available for ${baseSymbol}`);
        }
        if (!engines.has(counterSymbol)) {
            throw new Error(`No engine available for ${counterSymbol}`);
        }
        const ordersFromStore = await Promise.all(orders.map((order) => {
            const range = {
                gte: order.orderId,
                lte: order.orderId
            };
            return getRecords(this.ordersByOrderId, Order.fromStorage.bind(Order), this.ordersByOrderId.range(range));
        }));
        const ownOrderIds = ordersFromStore.filter(matchedOrders => matchedOrders && matchedOrders.length > 0).map(([order]) => order.orderId);
        const promisedFills = orders.map((order) => {
            const depthRemaining = targetDepth.minus(currentDepth);
            if (depthRemaining.lte(0)) {
                return;
            }
            if (ownOrderIds.includes(order.orderId)) {
                throw new Error(`Cannot fill own order ${order.orderId}`);
            }
            const fillAmount = depthRemaining.gt(order.baseAmount) ? order.baseAmount : depthRemaining.toString();
            currentDepth = currentDepth.plus(fillAmount);
            const fsm = FillStateMachine.create({
                relayer,
                engines,
                logger,
                store
            }, blockOrder.id, order, { fillAmount }).then((fsm) => {
                this.applyFsmListeners(fsm, blockOrder);
            });
            return fsm;
        });
        return Promise.all(promisedFills.filter(promise => promise));
    }
    applyFsmListeners(fsm, blockOrder) {
        fsm.once('execute', () => {
            this.checkBlockOrderCompletion(blockOrder.id)
                .catch(e => {
                this.logger.error(`BlockOrder failed to be completed from fill`, { id: blockOrder.id, error: e.stack });
            })
                .then(() => fsm.removeAllListeners());
        });
        fsm.once('reject', () => {
            fsm.removeAllListeners();
            if (fsm.shouldRetry()) {
                this.logger.info('Reworking block order due to relayer error');
                this.workBlockOrder(blockOrder, Big(fsm.fill.fillAmount));
            }
            else {
                this.failBlockOrder(blockOrder.id, fsm.fill.error).catch(e => {
                    this.logger.error(`BlockOrder failed on setting a failed status from fill`, { id: blockOrder.id, error: e.stack });
                });
            }
        });
        fsm.once('cancel', async () => {
            fsm.removeAllListeners();
        });
    }
}
module.exports = BlockOrderWorker;
//# sourceMappingURL=index.js.map