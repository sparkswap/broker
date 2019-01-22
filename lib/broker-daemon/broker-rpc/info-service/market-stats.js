const { Big } = require('../../utils');
const { currencies: currencyConfig } = require('../../config');
class MarketStats {
    constructor(market) {
        this.market = market;
        this.baseSymbol = market.split('/')[0];
        this.counterSymbol = market.split('/')[1];
        const { quantumsPerCommon: baseQuantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === this.baseSymbol) || {};
        const { quantumsPerCommon: counterQuantumsPerCommon } = currencyConfig.find(({ symbol: configSymbol }) => configSymbol === this.counterSymbol) || {};
        if (!baseQuantumsPerCommon)
            throw new Error(`Currency was not found when trying to commit to market: ${this.baseSymbol}`);
        if (!counterQuantumsPerCommon)
            throw new Error(`Currency was not found when trying to commit to market: ${this.counterSymbol}`);
        this.baseQuantumsPerCommon = baseQuantumsPerCommon;
        this.counterQuantumsPerCommon = counterQuantumsPerCommon;
    }
    async highestPrice(events = []) {
        return events.reduce((acc, event) => {
            const amount = Big(event.counterAmount).div(event.baseAmount);
            if (amount.gt(acc))
                return amount;
            return acc;
        }, Big(0));
    }
    async lowestPrice(events = []) {
        return events.reduce((acc, event, idx) => {
            const amount = Big(event.counterAmount).div(event.baseAmount);
            if (idx === 0)
                return amount;
            if (amount.lt(acc))
                return amount;
            return acc;
        }, Big(0));
    }
    async vwap(events = []) {
        const vwapTotalAmount = events.reduce((acc, event) => {
            return acc.plus(Big(event.counterAmount).times(event.baseAmount));
        }, Big(0));
        const vwapTotalShares = events.reduce((acc, event) => {
            return acc.plus(Big(event.baseAmount).times(event.baseAmount));
        }, Big(0));
        if (vwapTotalShares.eq(0)) {
            return Big(0);
        }
        return vwapTotalAmount.div(vwapTotalShares);
    }
    async bestAskAmount(asks = []) {
        return asks.reduce((acc, ask, idx) => {
            const amount = Big(ask.baseAmount).div(this.baseQuantumsPerCommon);
            if (idx === 0)
                return amount;
            if (amount.lt(acc))
                return amount;
            return acc;
        }, Big(0));
    }
    async bestBidAmount(bids = []) {
        return bids.reduce((acc, bid) => {
            const amount = Big(bid.baseAmount).div(this.baseQuantumsPerCommon);
            if (amount.gt(acc))
                return amount;
            return acc;
        }, Big(0));
    }
    async baseVolume(events = []) {
        return events.reduce((acc, event) => {
            const amount = Big(event.baseAmount).div(this.baseQuantumsPerCommon);
            return acc.plus(amount);
        }, Big(0));
    }
    async counterVolume(events = []) {
        return events.reduce((acc, event) => {
            const amount = Big(event.counterAmount).div(this.counterQuantumsPerCommon);
            return acc.plus(amount);
        }, Big(0));
    }
}
module.exports = MarketStats;
//# sourceMappingURL=market-stats.js.map