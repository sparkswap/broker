const MarketEvent = require('./market-event');
const Big = require('../utils/big');
const CONFIG = require('../config');
class MarketEventOrder {
    constructor({ orderId, createdAt, baseAmount, counterAmount, side, baseSymbol, counterSymbol }) {
        this.orderId = orderId;
        this.createdAt = createdAt;
        this.baseAmount = baseAmount;
        this.counterAmount = counterAmount;
        this.side = side;
        this.baseSymbol = baseSymbol;
        this.counterSymbol = counterSymbol;
    }
    get key() {
        return this.orderId;
    }
    get value() {
        const { createdAt, baseAmount, counterAmount, side, baseSymbol, counterSymbol } = this;
        return JSON.stringify({ createdAt, baseAmount, counterAmount, side, baseSymbol, counterSymbol });
    }
    get quantumPrice() {
        const counterAmount = Big(this.counterAmount);
        const baseAmount = Big(this.baseAmount);
        return counterAmount.div(baseAmount).toFixed(16);
    }
    get price() {
        const baseCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol);
        const counterCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === this.counterSymbol);
        const baseCommonAmount = Big(this.baseAmount).div(baseCurrencyConfig.quantumsPerCommon);
        const counterCommonAmount = Big(this.counterAmount).div(counterCurrencyConfig.quantumsPerCommon);
        return counterCommonAmount.div(baseCommonAmount).toFixed(16);
    }
    get amount() {
        const baseCurrencyConfig = CONFIG.currencies.find(({ symbol }) => symbol === this.baseSymbol);
        return Big(this.baseAmount).div(baseCurrencyConfig.quantumsPerCommon).toFixed(16);
    }
    serialize() {
        const { orderId, side, price, amount } = this;
        return {
            orderId,
            side,
            price,
            amount
        };
    }
    static fromEvent(event, marketName) {
        const params = {
            orderId: event.orderId
        };
        if (event.eventType === MarketEvent.TYPES.PLACED) {
            Object.assign(params, {
                createdAt: event.timestamp,
                baseAmount: event.payload.baseAmount.toString(),
                counterAmount: event.payload.counterAmount.toString(),
                side: event.payload.side,
                baseSymbol: marketName.split('/')[0],
                counterSymbol: marketName.split('/')[1]
            });
        }
        return new this(params);
    }
    static fromStorage(key, value) {
        return new this(Object.assign({ orderId: key }, JSON.parse(value)));
    }
}
MarketEventOrder.SIDES = Object.freeze({
    ASK: 'ASK',
    BID: 'BID'
});
module.exports = MarketEventOrder;
//# sourceMappingURL=market-event-order.js.map