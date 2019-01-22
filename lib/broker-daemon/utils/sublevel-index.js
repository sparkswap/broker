const { promisify } = require('util');
const through = require('through2');
const migrateStore = require('./migrate-store');
const logger = require('./logger');
const returnTrue = function () { return true; };
const DELIMITER = ':';
const LOWER_BOUND = '\x00';
const UPPER_BOUND = '\uffff';
class Index {
    constructor(store, name, getValue, filter = returnTrue, delimiter = DELIMITER) {
        this.store = store;
        this.name = name;
        this.getValue = getValue;
        this.filter = filter;
        this.delimiter = delimiter;
        this._deleted = {};
        this._index = this.store.sublevel(this.name);
    }
    async ensureIndex() {
        await this._clearIndex();
        await this._rebuildIndex();
        this._addIndexHook();
        return this;
    }
    range(opts = {}) {
        if (opts.gt) {
            opts.gt = `${opts.gt}${this.delimiter}${LOWER_BOUND}`;
        }
        else if (opts.gte) {
            opts.gte = `${opts.gte}${this.delimiter}${LOWER_BOUND}`;
        }
        if (opts.lt) {
            opts.lt = `${opts.lt}${this.delimiter}${UPPER_BOUND}`;
        }
        else if (opts.lte) {
            opts.lte = `${opts.lte}${this.delimiter}${UPPER_BOUND}`;
        }
        return opts;
    }
    createReadStream(opts) {
        const optionsToUpdate = Object.assign({}, opts);
        const updatedOptions = this.range(optionsToUpdate);
        const stream = this._index.createReadStream(updatedOptions);
        const index = this;
        return stream.pipe(through.obj(function ({ key, value }, encoding, callback) {
            if (index._isMarkedForDeletion(key)) {
                return callback();
            }
            this.push({ key: index._extractBaseKey(key), value });
            callback();
        }));
    }
    _extractBaseKey(indexKey) {
        const chunks = indexKey.split(this.delimiter);
        const baseKeyChunks = chunks.slice(1);
        return baseKeyChunks.join(this.delimiter);
    }
    _createIndexKey(baseKey, baseValue) {
        const indexValue = this.getValue(baseKey, baseValue);
        if (indexValue && indexValue.indexOf(this.delimiter) !== -1) {
            throw new Error(`Index values cannot contain the delimiter (${this.delimiter}). If your index value requires it, change the delimiter of the index and rebuild it.`);
        }
        return `${indexValue}${this.delimiter}${baseKey}`;
    }
    _startDeletion(baseKey) {
        this._deleted[baseKey] = true;
    }
    _finishDeletion(baseKey) {
        delete this._deleted[baseKey];
    }
    _isMarkedForDeletion(indexKey) {
        const baseKey = this._extractBaseKey(indexKey);
        return !!this._deleted[baseKey];
    }
    _removeFromIndex(baseKey) {
        this._startDeletion(baseKey);
        this.store.get(baseKey, async (err, value) => {
            if (err) {
                return logger.error(`Error while removing ${baseKey} from ${this.name} index`, err);
            }
            try {
                if (!this.filter(baseKey, value)) {
                    return;
                }
                await promisify(this._index.del)(this._createIndexKey(baseKey, value));
                this._finishDeletion(baseKey);
            }
            catch (e) {
                return logger.error(`Error while removing ${baseKey} from ${this.name} index`, e);
            }
        });
    }
    _addToIndexOperation(baseKey, baseValue) {
        const indexKey = this._createIndexKey(baseKey, baseValue);
        return { key: indexKey, value: baseValue, type: 'put', prefix: this._index };
    }
    _addIndexHook() {
        const indexHook = (dbOperation, add) => {
            const { key, value, type } = dbOperation;
            if (type === 'put' && this.filter(key, value)) {
                add(this._addToIndexOperation(key, value));
            }
            else if (type === 'del') {
                this._removeFromIndex(key);
            }
        };
        this._removeHook = this.store.pre(indexHook);
    }
    _clearIndex() {
        if (this._removeHook) {
            this._removeHook();
        }
        return migrateStore(this._index, this._index, (key) => ({ type: 'del', key, prefix: this._index }));
    }
    _rebuildIndex() {
        return migrateStore(this.store, this._index, (key, value) => {
            if (this.filter(key, value)) {
                return this._addToIndexOperation(key, value);
            }
        });
    }
}
module.exports = Index;
//# sourceMappingURL=sublevel-index.js.map