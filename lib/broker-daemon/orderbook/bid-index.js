const PriceIndex = require('./price-index');
const { Big } = require('../utils');
const { MarketEventOrder } = require('../models');
const MAX_VALUE = '9223372036854775807';
const PAD_SIZE = 40;
const DECIMAL_PLACES = 19;
class BidIndex extends PriceIndex {
    constructor(store) {
        super(store, MarketEventOrder.SIDES.BID);
    }
    keyForPrice(price) {
        return Big(MAX_VALUE).minus(Big(price)).toFixed(DECIMAL_PLACES).padStart(PAD_SIZE, '0');
    }
}
module.exports = BidIndex;
//# sourceMappingURL=bid-index.js.map