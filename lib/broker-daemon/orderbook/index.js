const { MarketEvent, MarketEventOrder } = require('../models');
const AskIndex = require('./ask-index');
const BidIndex = require('./bid-index');
const OrderbookIndex = require('./orderbook-index');
const { getRecords, Big } = require('../utils');
const nano = require('nano-seconds');
const consoleLogger = console;
consoleLogger.debug = console.log.bind(console);
const MAX_RETRY_INTERVAL = 60000;
class Orderbook {
    constructor(marketName, relayer, store, logger = consoleLogger) {
        this.marketName = marketName;
        this.relayer = relayer;
        this.eventStore = store.sublevel('events');
        this.index = new OrderbookIndex(store, this.eventStore, this.marketName);
        this.store = this.index.store;
        this.askIndex = new AskIndex(this.store);
        this.bidIndex = new BidIndex(this.store);
        this.logger = logger;
        this.synced = false;
    }
    get baseSymbol() {
        return this.marketName.split('/')[0];
    }
    get counterSymbol() {
        return this.marketName.split('/')[1];
    }
    async initialize() {
        this.logger.info(`Initializing market ${this.marketName}...`);
        this.synced = false;
        this.logger.debug(`Rebuilding indexes`);
        await this.index.ensureIndex();
        await this.askIndex.ensureIndex();
        await this.bidIndex.ensureIndex();
        await this.watchMarket();
    }
    async watchMarket(retries = 0) {
        this.logger.debug(`Watching market ${this.marketName}...`);
        const { baseSymbol, counterSymbol } = this;
        const { lastUpdated, sequence } = await this.lastUpdate();
        const params = { baseSymbol, counterSymbol, lastUpdated, sequence };
        const watcher = this.relayer.watchMarket(this.eventStore, params);
        const onWatcherSync = () => {
            this.synced = true;
            retries = 0;
            this.logger.info(`Market ${this.marketName} synced.`);
        };
        const onWatcherEnd = (error) => {
            this.synced = false;
            watcher.removeListener('sync', onWatcherSync);
            watcher.removeListener('error', onWatcherError);
            retries++;
            const delay = Math.min((2 ** retries - 1) * 1000, MAX_RETRY_INTERVAL);
            this.logger.info(`Market ${this.marketName} unavailable, retrying in ${delay}ms`, { error });
            setTimeout(() => this.watchMarket(retries), delay);
        };
        const onWatcherError = async (error) => {
            this.synced = false;
            watcher.removeListener('sync', onWatcherSync);
            watcher.removeListener('end', onWatcherEnd);
            this.logger.info(`Market ${this.marketName} encountered sync'ing error, re-building`, { error });
            await watcher.migrate();
            await this.index.ensureIndex();
            this.watchMarket();
        };
        watcher.once('sync', onWatcherSync);
        watcher.once('end', onWatcherEnd);
        watcher.once('error', onWatcherError);
    }
    async all() {
        this.assertSynced();
        this.logger.info(`Retrieving all records for ${this.marketName}`);
        return getRecords(this.store, MarketEventOrder.fromStorage.bind(MarketEventOrder));
    }
    async getTrades(since, limit) {
        this.assertSynced();
        const params = { limit };
        if (since) {
            const sinceDate = new Date(since).toISOString();
            params.gte = nano.toString(nano.fromISOString(sinceDate));
        }
        const trades = await getRecords(this.eventStore, MarketEvent.fromStorage.bind(MarketEvent), params);
        return trades;
    }
    getBestOrders({ side, depth, quantumPrice }) {
        this.assertSynced();
        return new Promise((resolve, reject) => {
            this.logger.info(`Retrieving best priced from ${side} up to ${depth}`);
            if (!MarketEventOrder.SIDES[side]) {
                return reject(new Error(`${side} is not a valid market side`));
            }
            let resolved = false;
            const orders = [];
            const targetDepth = Big(depth);
            let currentDepth = Big('0');
            function finish() {
                resolved = true;
                stream.pause();
                stream.unpipe();
                resolve({ orders, depth: currentDepth.toString() });
            }
            const index = side === MarketEventOrder.SIDES.BID ? this.bidIndex : this.askIndex;
            const stream = index.streamOrdersAtPriceOrBetter(quantumPrice);
            stream.on('error', reject);
            stream.on('end', () => {
                finish();
            });
            stream.on('data', ({ key, value }) => {
                if (resolved)
                    return;
                const order = MarketEventOrder.fromStorage(key, value);
                orders.push(order);
                currentDepth = currentDepth.plus(order.baseAmount);
                if (currentDepth.gte(targetDepth)) {
                    finish();
                }
            });
        });
    }
    async getAveragePrice(side, targetDepth) {
        const { orders, depth } = await this.getBestOrders({ side, depth: targetDepth });
        if (Big(depth).lt(targetDepth)) {
            const params = {
                market: this.marketName,
                side: this.side,
                depth,
                targetDepth
            };
            this.logger.error('Insufficient depth to find averagePrice', params);
            throw new Error('Insufficient depth to find averagePrice', params);
        }
        targetDepth = Big(targetDepth);
        let currentDepth = Big(0);
        let weightedPrice = Big(0);
        orders.forEach((order) => {
            const depthRemaining = targetDepth.minus(currentDepth);
            if (depthRemaining.lte(0)) {
                return;
            }
            const fillAmount = depthRemaining.gt(order.baseAmount) ? order.baseAmount : depthRemaining.toString();
            currentDepth = currentDepth.plus(fillAmount);
            weightedPrice = weightedPrice.plus(Big(order.price).times(fillAmount));
        });
        return Big(weightedPrice).div(targetDepth);
    }
    async getOrderbookEventsByTimestamp(timestamp) {
        this.assertSynced();
        return getRecords(this.store, (key, value) => JSON.parse(value), MarketEvent.rangeFromTimestamp(timestamp));
    }
    async getMarketEventsByTimestamp(timestamp) {
        this.assertSynced();
        return getRecords(this.eventStore, (key, value) => JSON.parse(value), MarketEvent.rangeFromTimestamp(timestamp));
    }
    assertSynced() {
        if (!this.synced) {
            throw new Error(`Cannot access Orderbook for ${this.marketName} until it is synced`);
        }
    }
    async getLastRecord() {
        const [lastEvent = {}] = await getRecords(this.eventStore, MarketEvent.fromStorage.bind(MarketEvent), {
            reverse: true,
            limit: 1
        });
        return lastEvent;
    }
    async lastUpdate() {
        this.logger.info(`Retrieving last update from store for ${this.marketName}`);
        const { timestamp: lastUpdated = '0', sequence = '0' } = await this.getLastRecord();
        return {
            lastUpdated,
            sequence
        };
    }
}
module.exports = Orderbook;
//# sourceMappingURL=index.js.map