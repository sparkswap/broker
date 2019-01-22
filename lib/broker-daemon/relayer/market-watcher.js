const EventEmitter = require('events');
const { promisify } = require('util');
const { MarketEvent } = require('../models');
const { migrateStore, eachRecord, Checksum } = require('../utils');
class MarketWatcher extends EventEmitter {
    constructor(watcher, store, RESPONSE_TYPES, logger) {
        super();
        this.watcher = watcher;
        this.store = store;
        this.logger = logger;
        this.RESPONSE_TYPES = RESPONSE_TYPES;
        this.finishBeforeProcessing = new Set();
        this.checksum = new Checksum();
        this.populateChecksum();
        this.setupListeners();
    }
    migrate() {
        this.logger.debug(`Removing existing orderbook events as part of migration`);
        const migration = migrateStore(this.store, this.store, (key) => { return { type: 'del', key }; });
        this.delayProcessingFor(migration);
        return migration;
    }
    setupListeners() {
        const removeWatcherListeners = () => {
            this.watcher.removeAllListeners();
            this.removeListener('end', removeWatcherListeners);
            this.removeListener('error', removeWatcherListeners);
        };
        this.on('end', removeWatcherListeners);
        this.on('error', removeWatcherListeners);
        this.watcher.on('end', () => {
            this.logger.error('Remote ended stream');
            this.emit('end', new Error('Remote ended stream'));
        });
        this.watcher.on('error', (err) => {
            this.logger.error('Relayer watchMarket grpc failed', err);
            this.emit('end', err);
        });
        this.watcher.on('data', (response) => {
            this.handleResponse(response);
        });
    }
    populateChecksum() {
        const checksumPopulation = eachRecord(this.store, (key, value) => {
            const marketEvent = MarketEvent.fromStorage(key, value);
            this.checksum.process(marketEvent.orderId);
        });
        this.delayProcessingFor(checksumPopulation);
    }
    async handleResponse(response) {
        const { RESPONSE_TYPES } = this;
        await this.delayProcessing();
        this.logger.debug(`response type is ${response.type}`);
        if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.START_OF_EVENTS) {
            this.migrate();
        }
        else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENT) {
            this.createMarketEvent(response);
        }
        else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.EXISTING_EVENTS_DONE) {
            this.upToDate(response);
        }
        else if (RESPONSE_TYPES[response.type] === RESPONSE_TYPES.NEW_EVENT) {
            this.createMarketEvent(response);
            this.validateChecksum(response.checksum);
        }
        else {
            this.logger.debug(`Unknown response type: ${response.type}`);
        }
    }
    delayProcessingFor(promise) {
        this.finishBeforeProcessing.add(promise);
    }
    async delayProcessing() {
        this.logger.debug(`Waiting for promises to resolve before acting on new response`);
        const promises = Array.from(this.finishBeforeProcessing);
        await Promise.all(promises);
        promises.forEach(promise => this.finishBeforeProcessing.delete(promise));
    }
    async createMarketEvent({ marketEvent }) {
        this.logger.debug('Creating a market event', marketEvent);
        const { key, value, orderId } = new MarketEvent(marketEvent);
        this.logger.debug('Adding market event to local checksum', { orderId });
        this.checksum.process(orderId);
        try {
            await promisify(this.store.put)(key, value);
        }
        catch (e) {
            this.logger.error('Saving market event failed, invalidating sync', { orderId });
            this.emit('error', e);
        }
    }
    upToDate({ checksum }) {
        if (this.validateChecksum(checksum)) {
            this.logger.debug('Up to date with market');
            this.emit('sync');
        }
    }
    validateChecksum(checksum) {
        this.logger.debug('Validating checksum', { checksum });
        if (!this.checksum.matches(Buffer.from(checksum, 'base64'))) {
            this.logger.error('Checksums did not match, invalidating');
            this.emit('error', new Error('[MarketWatcher]: Checksum mismatch'));
            return false;
        }
        return true;
    }
}
module.exports = MarketWatcher;
//# sourceMappingURL=market-watcher.js.map