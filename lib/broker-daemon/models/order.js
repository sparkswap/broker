var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const { Big } = require('../utils');
const DELIMITER = ':';
const LOWER_BOUND = '\x00';
const UPPER_BOUND = '\uffff';
class Order {
    constructor(blockOrderId, { baseSymbol, counterSymbol, side, baseAmount, counterAmount, makerBaseAddress, makerCounterAddress }) {
        this.blockOrderId = blockOrderId;
        this.baseSymbol = baseSymbol;
        this.counterSymbol = counterSymbol;
        this.baseAmount = baseAmount;
        this.counterAmount = counterAmount;
        this.makerBaseAddress = makerBaseAddress;
        this.makerCounterAddress = makerCounterAddress;
        if (!Order.SIDES[side]) {
            throw new Error(`${side} is not a valid order side.`);
        }
        this.side = side;
    }
    setCreatedParams({ orderId, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired }) {
        this.orderId = orderId;
        this.feePaymentRequest = feePaymentRequest;
        this.feeRequired = feeRequired;
        this.depositPaymentRequest = depositPaymentRequest;
        this.depositRequired = depositRequired;
    }
    setFilledParams({ swapHash, fillAmount, takerAddress }) {
        this.swapHash = swapHash;
        this.fillAmount = fillAmount;
        this.takerAddress = takerAddress;
    }
    setSettledParams({ swapPreimage }) {
        this.swapPreimage = swapPreimage;
    }
    get baseFillAmount() {
        return this.fillAmount;
    }
    get counterFillAmount() {
        if (!this.fillAmount) {
            throw new Error(`Cannot calculate counterFillAmount without a fillAmount`);
        }
        const counterFillAmount = Big(this.counterAmount).div(this.baseAmount).times(this.fillAmount);
        return counterFillAmount.round(0).toString();
    }
    get inboundSymbol() {
        return this.side === Order.SIDES.BID ? this.baseSymbol : this.counterSymbol;
    }
    get outboundSymbol() {
        return this.side === Order.SIDES.BID ? this.counterSymbol : this.baseSymbol;
    }
    get inboundAmount() {
        return this.side === Order.SIDES.BID ? this.baseAmount : this.counterAmount;
    }
    get outboundAmount() {
        return this.side === Order.SIDES.BID ? this.counterAmount : this.baseAmount;
    }
    get inboundFillAmount() {
        if (!this.fillAmount) {
            throw new Error(`Cannot calculate inboundFillAmount without a fillAmount`);
        }
        return this.side === Order.SIDES.BID ? this.baseFillAmount : this.counterFillAmount;
    }
    get outboundFillAmount() {
        if (!this.fillAmount) {
            throw new Error(`Cannot calculate outboundFillAmount without a fillAmount`);
        }
        return this.side === Order.SIDES.BID ? this.counterFillAmount : this.baseFillAmount;
    }
    get paramsForCreate() {
        const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, makerBaseAddress, makerCounterAddress } = this;
        return {
            baseSymbol,
            counterSymbol,
            side,
            baseAmount,
            counterAmount,
            makerBaseAddress,
            makerCounterAddress
        };
    }
    get paramsForPlace() {
        const { feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, orderId, outboundSymbol } = this;
        if (feeRequired && !feePaymentRequest) {
            throw new Error(`paramsForPlace: feePaymentRequest is missing.`);
        }
        if (depositRequired && !depositPaymentRequest) {
            throw new Error(`paramsForPlace: depositPaymentRequest is missing.`);
        }
        if (!orderId) {
            throw new Error(`paramsForPlace: orderId is missing.`);
        }
        if (!outboundSymbol) {
            throw new Error(`paramsForPlace: outboundSymbol is missing.`);
        }
        return {
            feePaymentRequest,
            feeRequired,
            depositPaymentRequest,
            depositRequired,
            orderId,
            outboundSymbol
        };
    }
    get paramsForPrepareSwap() {
        const { orderId, swapHash, inboundSymbol, inboundFillAmount } = this;
        if (!orderId) {
            throw new Error(`paramsForGetPreimage: orderId is missing.`);
        }
        if (!swapHash) {
            throw new Error(`paramsForGetPreimage: swapHash is missing.`);
        }
        if (!inboundSymbol) {
            throw new Error(`paramsForGetPreimage: inboundSymbol is missing.`);
        }
        if (!inboundFillAmount) {
            throw new Error(`paramsForGetPreimage: inboundFillAmount is missing.`);
        }
        return { orderId, swapHash, symbol: inboundSymbol, amount: inboundFillAmount };
    }
    get paramsForGetPreimage() {
        const { swapHash, inboundSymbol } = this;
        if (!swapHash) {
            throw new Error(`paramsForGetPreimage: swapHash is missing.`);
        }
        if (!inboundSymbol) {
            throw new Error(`paramsForGetPreimage: inboundSymbol is missing.`);
        }
        return { swapHash, symbol: inboundSymbol };
    }
    get paramsForComplete() {
        const { swapPreimage, orderId } = this;
        if (!swapPreimage) {
            throw new Error(`paramsForGetPreimage: swapPreimage is missing.`);
        }
        if (!orderId) {
            throw new Error(`paramsForGetPreimage: orderId is missing.`);
        }
        return { swapPreimage, orderId };
    }
    get quantumPrice() {
        const counterAmount = Big(this.counterAmount);
        const baseAmount = Big(this.baseAmount);
        return counterAmount.div(baseAmount).toFixed(16);
    }
    get key() {
        if (!this.orderId || !this.blockOrderId) {
            return undefined;
        }
        return `${this.blockOrderId}${DELIMITER}${this.orderId}`;
    }
    get value() {
        return JSON.stringify(this.valueObject);
    }
    get valueObject() {
        const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, makerBaseAddress, makerCounterAddress, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, swapHash, fillAmount, takerAddress } = this;
        return {
            baseSymbol,
            counterSymbol,
            side,
            baseAmount,
            counterAmount,
            makerBaseAddress,
            makerCounterAddress,
            feePaymentRequest,
            feeRequired,
            depositPaymentRequest,
            depositRequired,
            swapHash,
            fillAmount,
            takerAddress
        };
    }
    static fromStorage(key, orderStateMachineRecord) {
        return this.fromObject(key, JSON.parse(orderStateMachineRecord).order);
    }
    static fromObject(key, valueObject) {
        const [blockOrderId, orderId] = key.split(DELIMITER);
        const { baseSymbol, counterSymbol, side, baseAmount, counterAmount, makerBaseAddress, makerCounterAddress } = valueObject, otherParams = __rest(valueObject, ["baseSymbol", "counterSymbol", "side", "baseAmount", "counterAmount", "makerBaseAddress", "makerCounterAddress"]);
        const order = new this(blockOrderId, {
            baseSymbol,
            counterSymbol,
            side,
            baseAmount,
            counterAmount,
            makerBaseAddress,
            makerCounterAddress
        });
        const { feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, swapHash, fillAmount, takerAddress } = otherParams;
        Object.assign(order, {
            orderId,
            feePaymentRequest,
            feeRequired,
            depositPaymentRequest,
            depositRequired,
            swapHash,
            fillAmount,
            takerAddress
        });
        return order;
    }
    static rangeForBlockOrder(blockOrderId) {
        return {
            gte: `${blockOrderId}${DELIMITER}${LOWER_BOUND}`,
            lte: `${blockOrderId}${DELIMITER}${UPPER_BOUND}`
        };
    }
}
Order.SIDES = Object.freeze({
    ASK: 'ASK',
    BID: 'BID'
});
module.exports = Order;
//# sourceMappingURL=order.js.map