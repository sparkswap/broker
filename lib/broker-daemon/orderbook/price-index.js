const { SublevelIndex } = require('../utils');
const { MarketEventOrder } = require('../models');
class PriceIndex extends SublevelIndex {
    constructor(store, side) {
        super(store, side);
        this.side = side;
        this.getValue = this._getValue.bind(this);
        this.filter = this._filter.bind(this);
    }
    _filter(key, value) {
        const order = MarketEventOrder.fromStorage(key, value);
        return order.side === this.side;
    }
    _getValue(key, value) {
        const order = MarketEventOrder.fromStorage(key, value);
        return this.keyForPrice(order.quantumPrice);
    }
    keyForPrice(quantumPrice) {
        throw new Error('`keyForPrice` must be implemented by child classes.');
    }
    streamOrdersAtPriceOrBetter(quantumPrice) {
        const opts = {};
        if (quantumPrice) {
            opts.lte = this.keyForPrice(quantumPrice);
        }
        return this.createReadStream(opts);
    }
}
module.exports = PriceIndex;
//# sourceMappingURL=price-index.js.map