/**
 * Pipe data from one sublevel store into another
 * @todo Refactor into an iterator pattern using streams2
 * @param  {sublevel} sourceStore       - Sublevel that is the source of the data to pipe
 * @param  {sublevel} targetStore       - Sublevel that is the destination of the data
 * @param  {Function} createDbOperation - Function that returns a sublevel batch-compatible database operation to take on the target store
 * @returns {Promise<void>}
 */
async function migrateStore (sourceStore, targetStore, createDbOperation) {
  return new Promise((resolve, reject) => {
    const stream = sourceStore.createReadStream()
    let batch = []

    function flush (done = () => {}) {
      if (!batch.length) {
        return process.nextTick(done)
      }

      targetStore.batch(batch, (err) => {
        if (err) return reject(err)
        done()
      })

      // clear the batch
      batch = []
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
    })
  })
}

module.exports = migrateStore
