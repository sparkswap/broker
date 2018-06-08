/**
 * Pipe data from one sublevel store into another
 * @param  {sublevel} sourceStore       Sublevel that is the source of the data to pipe
 * @param  {sublevel} targetStore       Sublevel that is the destination of the data
 * @param  {Function} createDbOperation Function that returns a sublevel batch-compatible database operation to take on the target store
 * @param  {Number}   batchSize         Number of operations to batch before executing on the target database
 * @return {Promise<void>}
 */
async function migrateStore (sourceStore, targetStore, createDbOperation, batchSize = 20) {
  return new Promise((resolve, reject) => {
    const stream = sourceStore.createReadStream()
    const batch = []

    function flush (done = function () {}) {
      targetStore.batch(batch, (err) => {
        if (err) reject(err)
        done()
      })

      // clear the batch
      batch.splice(0, batch.length)
    }

    stream.on('error', reject)

    stream.on('end', () => {
      flush(resolve)
    })

    stream.on('data', ({ key, value }) => {
      const op = createDbOperation(key, value)

      if (op) {
        batch.push(op)
      }

      if (batch.length > batchSize) {
        flush()
      }
    })
  })
}

module.exports = migrateStore
