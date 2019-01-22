const PriceIndex = require('./price-index');
const { MarketEventOrder } = require('../models');
const { Big } = require('../utils');
const PAD_SIZE = 40;
const DECIMAL_PLACES = 19;
class AskIndex extends PriceIndex {
    constructor(store) {
        super(store, MarketEventOrder.SIDES.ASK);
    }
    keyForPrice(price) {
        return Big(price).toFixed(DECIMAL_PLACES).padStart(PAD_SIZE, '0');
    }
}
module.exports = AskIndex;
//# sourceMappingURL=ask-index.js.map