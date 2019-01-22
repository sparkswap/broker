const { MarketEvent, MarketEventOrder } = require('../models');
const { migrateStore } = require('../utils');
class OrderbookIndex {
    constructor(store, eventStore, marketName) {
        this.store = store.sublevel('orderbook');
        this.eventStore = eventStore;
        this.marketName = marketName;
    }
    async ensureIndex() {
        await this._clearIndex();
        await this._rebuildIndex();
        this._addIndexHook();
    }
    _addToIndexOperation(key, value) {
        const event = MarketEvent.fromStorage(key, value);
        const order = MarketEventOrder.fromEvent(event, this.marketName);
        if (event.eventType === MarketEvent.TYPES.PLACED) {
            return { key: order.key, value: order.value, type: 'put', prefix: this.store };
        }
        return { key: order.key, type: 'del', prefix: this.store };
    }
    _clearIndex() {
        if (this._removeHook) {
            this._removeHook();
        }
        return migrateStore(this.store, this.store, (key) => { return { type: 'del', key }; });
    }
    _rebuildIndex() {
        return migrateStore(this.eventStore, this.store, this._addToIndexOperation.bind(this));
    }
    _addIndexHook() {
        const indexHook = (dbOperation, add) => {
            if (dbOperation.type !== 'put') {
                return;
            }
            add(this._addToIndexOperation(dbOperation.key, dbOperation.value));
        };
        this._removeHook = this.eventStore.pre(indexHook);
    }
}
module.exports = OrderbookIndex;
//# sourceMappingURL=orderbook-index.js.map