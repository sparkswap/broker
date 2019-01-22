function eachRecord(store, fn, params = {}) {
    return new Promise((resolve, reject) => {
        const stream = store.createReadStream(params);
        stream.on('error', reject);
        stream.on('end', () => {
            resolve();
        });
        stream.on('data', ({ key, value }) => {
            fn(key, value);
        });
    });
}
module.exports = eachRecord;
//# sourceMappingURL=each-record.js.map