const { promisify } = require('util');
const nano = require('nano-seconds');
const Order = require('./order');
const Fill = require('./fill');
const { Big, nanoToDatetime, getRecords } = require('../utils');
const CONFIG = require('../config');
const { BlockOrderNotFoundError } = require('./errors');
const { OrderStateMachine, FillStateMachine } = require('../state-machines');
class BlockOrder {
    constructor({ id, marketName, side, amount, price, timeInForce, timestamp, status = BlockOrder.STATUSES.ACTIVE }) {
        this.id = id;
        this.marketName = marketName;
        this.price = price ? Big(price) : null;
        this.status = status;
        this.timestamp = timestamp || nano.toString();
        if (!this.baseCurrencyConfig) {
            throw new Error(`No currency configuration is available for ${this.baseSymbol}`);
        }
        if (!this.counterCurrencyConfig) {
            throw new Error(`No currency configuration is available for ${this.counterSymbol}`);
        }
        if (!BlockOrder.TIME_RESTRICTIONS[timeInForce]) {
            throw new Error(`${timeInForce} is not a supported time restriction`);
        }
        this.timeInForce = timeInForce;
        if (!BlockOrder.SIDES[side]) {
            throw new Error(`${side} is not a valid side for a BlockOrder`);
        }
        this.side = side;
        if (!amount) {
            throw new Error(`A transaction amount is required to create a block order`);
        }
        this.amount = Big(amount);
        if (this.baseAmount !== this.amount.times(this.baseCurrencyConfig.quantumsPerCommon).toString()) {
            throw new Error(`Amount is too precise for ${this.baseSymbol}`);
        }
        this.orders = [];
        this.fills = [];
    }
    get datetime() {
        return nanoToDatetime(this.timestamp);
    }
    get inverseSide() {
        if (this.side === BlockOrder.SIDES.BID) {
            return BlockOrder.SIDES.ASK;
        }
        return BlockOrder.SIDES.BID;
    }
    get baseSymbol() {
        return this.marketName.split('/')[0];
    }
    get counterSymbol() {
        return this.marketName.split('/')[1];
    }
    get baseCurrencyConfig() {
        return CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol);
    }
    get counterCurrencyConfig() {
        return CONFIG.currencies.find(({ symbol }) => symbol === this.counterSymbol);
    }
    get baseAmount() {
        return this.amount.times(this.baseCurrencyConfig.quantumsPerCommon).round(0).toString();
    }
    get counterAmount() {
        if (!this.price) {
            return;
        }
        const counterCommonAmount = this.amount.times(this.price);
        return counterCommonAmount.times(this.counterCurrencyConfig.quantumsPerCommon).round(0).toString();
    }
    get outboundAmount() {
        return this.isBid ? this.counterAmount : this.baseAmount;
    }
    get inboundAmount() {
        return this.isBid ? this.baseAmount : this.counterAmount;
    }
    get inboundSymbol() {
        return this.isBid ? this.baseSymbol : this.counterSymbol;
    }
    get outboundSymbol() {
        return this.isBid ? this.counterSymbol : this.baseSymbol;
    }
    get quantumPrice() {
        if (!this.counterAmount)
            return;
        return Big(this.counterAmount).div(this.baseAmount).toFixed(16);
    }
    get key() {
        return this.id;
    }
    get value() {
        const { marketName, side, amount, price, timeInForce, timestamp, status } = this;
        return JSON.stringify({
            marketName,
            side,
            amount: amount.toString(),
            price: price ? price.toString() : null,
            timeInForce,
            timestamp,
            status
        });
    }
    get activeFills() {
        const { CREATED, FILLED } = FillStateMachine.STATES;
        return this.fills.filter(fill => [CREATED, FILLED].includes(fill.state));
    }
    get activeOrders() {
        const { CREATED, PLACED, EXECUTING } = OrderStateMachine.STATES;
        return this.orders.filter(order => [CREATED, PLACED, EXECUTING].includes(order.state));
    }
    get openOrders() {
        const { CREATED, PLACED } = OrderStateMachine.STATES;
        return this.orders.filter(order => [CREATED, PLACED].includes(order.state));
    }
    get isBid() {
        return this.side === BlockOrder.SIDES.BID;
    }
    get isAsk() {
        return this.side === BlockOrder.SIDES.ASK;
    }
    get isInWorkableState() {
        return this.status === BlockOrder.STATUSES.ACTIVE;
    }
    get isMarketOrder() {
        return !this.price;
    }
    fail() {
        this.status = BlockOrder.STATUSES.FAILED;
        return this;
    }
    complete() {
        this.status = BlockOrder.STATUSES.COMPLETED;
        return this;
    }
    cancel() {
        this.status = BlockOrder.STATUSES.CANCELLED;
        return this;
    }
    activeOutboundAmount() {
        const activeOrderAmount = this.activeOrders.reduce((acc, { order, state }) => {
            if (state === OrderStateMachine.STATES.EXECUTING) {
                return acc.plus(order.outboundFillAmount);
            }
            else {
                return acc.plus(order.outboundAmount);
            }
        }, Big(0));
        const activeFillAmount = this.activeFills.reduce((acc, { fill }) => {
            return acc.plus(fill.outboundAmount);
        }, Big(0));
        return activeOrderAmount.plus(activeFillAmount);
    }
    activeInboundAmount() {
        const activeOrderAmount = this.activeOrders.reduce((acc, { order, state }) => {
            if (state === OrderStateMachine.STATES.EXECUTING) {
                return acc.plus(order.inboundFillAmount);
            }
            else {
                return acc.plus(order.inboundAmount);
            }
        }, Big(0));
        const activeFillAmount = this.activeFills.reduce((acc, { fill }) => {
            return acc.plus(fill.inboundAmount);
        }, Big(0));
        return activeOrderAmount.plus(activeFillAmount);
    }
    async populateOrders(store) {
        const orders = await getRecords(store, (key, value) => {
            const { order, state, error } = JSON.parse(value);
            return { order: Order.fromObject(key, order), state, error };
        }, Order.rangeForBlockOrder(this.id));
        this.orders = orders;
    }
    async populateFills(store) {
        const fills = await getRecords(store, (key, value) => {
            const { fill, state, error } = JSON.parse(value);
            return { fill: Fill.fromObject(key, fill), state, error };
        }, Fill.rangeForBlockOrder(this.id));
        this.fills = fills;
    }
    serialize() {
        const baseAmountFactor = this.baseCurrencyConfig.quantumsPerCommon;
        const counterAmountFactor = this.counterCurrencyConfig.quantumsPerCommon;
        const orders = this.orders.map(({ order, state, error }) => {
            const baseCommonAmount = Big(order.baseAmount).div(baseAmountFactor);
            const counterCommonAmount = Big(order.counterAmount).div(counterAmountFactor);
            return {
                orderId: order.orderId,
                amount: baseCommonAmount.toFixed(16),
                price: counterCommonAmount.div(baseCommonAmount).toFixed(16),
                orderStatus: state.toUpperCase(),
                orderError: error ? error.toString() : undefined
            };
        });
        const fills = this.fills.map(({ fill, state, error }) => {
            const baseCommonAmount = Big(fill.fillAmount).div(baseAmountFactor);
            const counterCommonAmount = Big(fill.counterFillAmount).div(counterAmountFactor);
            return {
                orderId: fill.order.orderId,
                fillId: fill.fillId,
                amount: baseCommonAmount.toFixed(16),
                price: counterCommonAmount.div(baseCommonAmount).toFixed(16),
                fillStatus: state.toUpperCase(),
                fillError: error ? error.toString() : undefined
            };
        });
        const serialized = {
            market: this.marketName,
            side: this.side,
            amount: this.amount.toFixed(16),
            timeInForce: this.timeInForce,
            status: this.status,
            timestamp: this.timestamp,
            datetime: this.datetime,
            orders,
            fills: fills
        };
        if (this.price) {
            serialized.limitPrice = this.price.toFixed(16);
        }
        else {
            serialized.isMarketOrder = true;
        }
        return serialized;
    }
    serializeSummary() {
        const serialized = {
            blockOrderId: this.id,
            market: this.marketName,
            side: this.side,
            amount: this.amount.toFixed(16),
            timeInForce: this.timeInForce,
            timestamp: this.timestamp,
            datetime: this.datetime,
            status: this.status
        };
        if (this.price) {
            serialized.limitPrice = this.price.toFixed(16);
        }
        else {
            serialized.isMarketOrder = true;
        }
        return serialized;
    }
    static fromStorage(key, value) {
        const { marketName, side, amount, price, timeInForce, timestamp, status } = JSON.parse(value);
        const id = key;
        if (!BlockOrder.STATUSES[status]) {
            throw new Error(`Block Order status of ${status} is invalid`);
        }
        return new this({ id, marketName, side, amount, price, timeInForce, timestamp, status });
    }
    static async fromStore(store, blockOrderId) {
        if (!store)
            throw new Error('[BlockOrder#fromStore] No store is defined');
        try {
            var value = await promisify(store.get)(blockOrderId);
        }
        catch (e) {
            if (e.notFound) {
                throw new BlockOrderNotFoundError(blockOrderId, e);
            }
            throw e;
        }
        return BlockOrder.fromStorage(blockOrderId, value);
    }
}
BlockOrder.TIME_RESTRICTIONS = Object.freeze({
    GTC: 'GTC'
});
BlockOrder.SIDES = Object.freeze({
    BID: 'BID',
    ASK: 'ASK'
});
BlockOrder.STATUSES = Object.freeze({
    ACTIVE: 'ACTIVE',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
});
BlockOrder.ERRORS = Object.freeze({
    BlockOrderNotFoundError
});
module.exports = BlockOrder;
//# sourceMappingURL=block-order.js.map