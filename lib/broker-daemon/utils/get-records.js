const eachRecord = require('./each-record');
async function getRecords(store, fn, params = {}) {
    const records = [];
    await eachRecord(store, (key, value) => {
        records.push(fn(key, value));
    }, params);
    return records;
}
module.exports = getRecords;
//# sourceMappingURL=get-records.js.map