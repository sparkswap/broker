async function migrateStore(sourceStore, targetStore, createDbOperation, batchSize = 20) {
    return new Promise((resolve, reject) => {
        const stream = sourceStore.createReadStream();
        let batch = [];
        function flush(done = () => { }) {
            if (!batch.length) {
                return process.nextTick(done);
            }
            targetStore.batch(batch, (err) => {
                if (err)
                    return reject(err);
                done();
            });
            batch = [];
        }
        stream.on('error', reject);
        stream.on('end', () => {
            flush(resolve);
        });
        stream.on('data', ({ key, value }) => {
            const op = createDbOperation(key, value);
            if (op) {
                batch.push(op);
            }
            if (batch.length > batchSize) {
                flush();
            }
        });
    });
}
module.exports = migrateStore;
//# sourceMappingURL=migrate-store.js.map