const { promisify } = require('util');
const StateMachinePlugin = require('./abstract');
class StateMachinePersistence extends StateMachinePlugin {
    constructor({ key = 'id', additionalFields = {}, storeName = 'store' } = {}) {
        super();
        this.key = key;
        this.additionalFields = additionalFields;
        this.storeName = storeName;
    }
    init(instance) {
        super.init(instance);
        if (!instance[this.storeName] || typeof instance[this.storeName].put !== 'function') {
            throw new Error(`A store must be present on the state machine at ${this.storeName} in order to use the persistence plugin`);
        }
    }
    get persistedFields() {
        const fields = {
            state: function (state) {
                if (state) {
                    this.goto(state);
                }
                else {
                    return this.state;
                }
            }
        };
        return Object.assign(fields, this.additionalFields);
    }
    get transitions() {
        return [
            { name: 'goto', from: '*', to: (s) => s }
        ];
    }
    get observers() {
        const plugin = this;
        return {
            onEnterState: async function (lifecycle) {
                if (lifecycle.transition !== 'goto') {
                    let key;
                    if (typeof plugin.key === 'function') {
                        key = plugin.key.call(this);
                    }
                    else {
                        key = this[plugin.key];
                    }
                    return this.persist(key);
                }
            }
        };
    }
    get methods() {
        const plugin = this;
        return {
            persist: async function (key) {
                if (!key) {
                    throw new Error(`A key is required to save state`);
                }
                const fields = plugin.persistedFields || {};
                const data = {};
                Object.entries(fields).forEach(([name, getter]) => {
                    data[name] = getter.call(this);
                });
                plugin.hook(this, 'persist', [key, data]);
                await promisify(this[plugin.storeName].put)(key, JSON.stringify(data));
            }
        };
    }
    get staticMethods() {
        const plugin = this;
        return {
            fromStore: function (initParams, { key, value }) {
                const fields = plugin.persistedFields || {};
                const parsedValue = JSON.parse(value);
                const instance = new this(initParams);
                if (typeof plugin.key === 'function') {
                    plugin.key.call(instance, key, parsedValue);
                }
                else {
                    instance[plugin.key] = key;
                }
                Object.entries(fields).forEach(([name, setter]) => {
                    setter.call(instance, parsedValue[name], key, parsedValue);
                });
                plugin.hook(instance, 'inflate', [key, parsedValue]);
                return instance;
            },
            get: async function (key, initParams) {
                const store = initParams[plugin.storeName];
                if (!store || typeof store.get !== 'function') {
                    throw new Error(`A store must be present at ${plugin.storeName} in order to use the persistence plugin`);
                }
                const value = await promisify(store.get)(key);
                return this.fromStore(initParams, { key, value });
            }
        };
    }
}
module.exports = StateMachinePersistence;
//# sourceMappingURL=persistence.js.map