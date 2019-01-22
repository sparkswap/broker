var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const Order = require('./order');
const { Big } = require('../utils');
const DELIMITER = ':';
const LOWER_BOUND = '\x00';
const UPPER_BOUND = '\uffff';
class Fill {
    constructor(blockOrderId, { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount, takerBaseAddress, takerCounterAddress }) {
        this.blockOrderId = blockOrderId;
        this.order = {
            orderId,
            baseSymbol,
            counterSymbol,
            baseAmount,
            counterAmount
        };
        if (!Order.SIDES[side]) {
            throw new Error(`${side} is not a valid order side.`);
        }
        this.order.side = side;
        this.fillAmount = fillAmount;
        this.takerBaseAddress = takerBaseAddress;
        this.takerCounterAddress = takerCounterAddress;
    }
    setSwapHash(swapHash) {
        this.swapHash = swapHash;
    }
    setCreatedParams({ fillId, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired }) {
        this.fillId = fillId;
        this.feePaymentRequest = feePaymentRequest;
        this.feeRequired = feeRequired;
        this.depositPaymentRequest = depositPaymentRequest;
        this.depositRequired = depositRequired;
    }
    setExecuteParams({ makerAddress }) {
        this.makerAddress = makerAddress;
    }
    get paramsForCreate() {
        const { fillAmount, swapHash, takerBaseAddress, takerCounterAddress, order: { orderId } } = this;
        return {
            fillAmount,
            orderId,
            swapHash,
            takerBaseAddress,
            takerCounterAddress
        };
    }
    get paramsForFill() {
        const { feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, fillId, outboundSymbol } = this;
        if (feeRequired && !feePaymentRequest) {
            throw new Error(`paramsForFill: feePaymentRequest is required.`);
        }
        if (depositRequired && !depositPaymentRequest) {
            throw new Error(`paramsForFill: depositPaymentRequest is required.`);
        }
        if (!fillId) {
            throw new Error(`paramsForFill: fillId is required.`);
        }
        if (!outboundSymbol) {
            throw new Error(`paramsForFill: outboundSymbol is required.`);
        }
        return {
            feePaymentRequest,
            feeRequired,
            depositPaymentRequest,
            depositRequired,
            fillId,
            outboundSymbol
        };
    }
    get paramsForSwap() {
        const { makerAddress, swapHash, outboundSymbol, outboundAmount } = this;
        if (![makerAddress, swapHash, outboundSymbol, outboundAmount].every(param => !!param)) {
            throw new Error('makerAddress, swapHash, outboundSymbol, outboundAmount are required params for execution');
        }
        return {
            makerAddress,
            swapHash,
            symbol: outboundSymbol,
            amount: outboundAmount
        };
    }
    get baseFillAmount() {
        return this.fillAmount;
    }
    get counterFillAmount() {
        const baseAmount = Big(this.order.baseAmount);
        const counterAmount = Big(this.order.counterAmount);
        const fillAmount = Big(this.fillAmount);
        return counterAmount.times(fillAmount).div(baseAmount).round(0).toString();
    }
    get inboundSymbol() {
        return this.order.side === Order.SIDES.BID ? this.order.counterSymbol : this.order.baseSymbol;
    }
    get outboundSymbol() {
        return this.order.side === Order.SIDES.BID ? this.order.baseSymbol : this.order.counterSymbol;
    }
    get inboundAmount() {
        return this.order.side === Order.SIDES.BID ? this.counterFillAmount : this.baseFillAmount;
    }
    get outboundAmount() {
        return this.order.side === Order.SIDES.BID ? this.baseFillAmount : this.counterFillAmount;
    }
    get quantumPrice() {
        const counterAmount = Big(this.order.counterAmount);
        const baseAmount = Big(this.order.baseAmount);
        return counterAmount.div(baseAmount).toFixed(16);
    }
    get key() {
        if (!this.fillId || !this.blockOrderId) {
            return undefined;
        }
        return `${this.blockOrderId}${DELIMITER}${this.fillId}`;
    }
    get value() {
        return JSON.stringify(this.valueObject);
    }
    get valueObject() {
        const { order: { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, fillAmount, swapHash, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, makerAddress, takerBaseAddress, takerCounterAddress } = this;
        return {
            order: {
                orderId,
                baseSymbol,
                counterSymbol,
                side,
                baseAmount,
                counterAmount
            },
            fillAmount,
            swapHash,
            feePaymentRequest,
            feeRequired,
            depositPaymentRequest,
            depositRequired,
            makerAddress,
            takerBaseAddress,
            takerCounterAddress
        };
    }
    static fromStorage(key, fillStateMachineRecord) {
        return this.fromObject(key, JSON.parse(fillStateMachineRecord).fill);
    }
    static fromObject(key, valueObject) {
        const [blockOrderId, fillId] = key.split(DELIMITER);
        const { order: { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, fillAmount, takerBaseAddress, takerCounterAddress } = valueObject, otherParams = __rest(valueObject, ["order", "fillAmount", "takerBaseAddress", "takerCounterAddress"]);
        const fill = new this(blockOrderId, {
            orderId,
            baseSymbol,
            counterSymbol,
            side,
            baseAmount,
            counterAmount
        }, {
            fillAmount,
            takerBaseAddress,
            takerCounterAddress
        });
        const { swapHash, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, makerAddress } = otherParams;
        Object.assign(fill, {
            fillId,
            swapHash,
            feePaymentRequest,
            feeRequired,
            depositPaymentRequest,
            depositRequired,
            makerAddress
        });
        return fill;
    }
    static rangeForBlockOrder(blockOrderId) {
        return {
            gte: `${blockOrderId}${DELIMITER}${LOWER_BOUND}`,
            lte: `${blockOrderId}${DELIMITER}${UPPER_BOUND}`
        };
    }
}
module.exports = Fill;
//# sourceMappingURL=fill.js.map