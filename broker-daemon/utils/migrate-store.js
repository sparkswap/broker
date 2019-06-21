/**
 * Pipe data from one sublevel store into another
 * @todo Refactor into an iterator pattern using streams2
 * @param  {sublevel} sourceStore       - Sublevel that is the source of the data to pipe
 * @param  {sublevel} targetStore       - Sublevel that is the destination of the data
 * @param  {Function} createDbOperation - Function that returns a sublevel batch-compatible database operation to take on the target store
 * @param  {number}   batchSize         - Number of operations to batch before executing on the target database
 * @returns {Promise<void>}
 */
async function migrateStore (sourceStore, targetStore, createDbOperation, batchSize = 2000) {
  return new Promise((resolve, reject) => {
    const stream = sourceStore.createReadStream()

    // `batchInProgress` allows us to batch save records in sequence and lock the operation
    // to make sure we are not inserting records out of the order they are received.
    //
    // We set this value to automatically resolve on the first use. This value is then
    // subsequently set when a batch is processed
    let batchInProgress = async () => {}
    let batchResolve

    let batch = []

    async function flush (done = () => {}) {
      if (!batch.length) {
        return process.nextTick(done)
      }

      await batchInProgress()

      batchInProgress = () => {
        return new Promise((resolve, reject) => {
          batchResolve = resolve
        })
      }

      try {
        targetStore.batch(batch, (err) => {
          if (err) {
            batchResolve()
            return reject(err)
          }

          batchResolve()
          done()
        })
      } catch (e) {
        batchResolve()
        throw (e)
      }

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

      if (batch.length >= batchSize) {
        flush()
      }
    })
  })
}

module.exports = migrateStore
