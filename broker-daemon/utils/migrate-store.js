const { promisify } = require('util')

/**
 * Pipe data from one sublevel store into another
 *
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

    let previousBatch = async () => {}
    let batch = []

    stream.on('error', reject)

    stream.on('end', async () => {
      await previousBatch()
      return resolve()
    })

    stream.on('data', async ({ key, value }) => {
      const op = createDbOperation(key, value)

      if (!op) return

      batch.push(op)

      if (!(batch.length >= batchSize)) {
        return
      }

      await previousBatch()

      previousBatch = promisify(targetStore.batch)(batch)

      // Clear the batch
      batch = []
    })
  })
}

module.exports = migrateStore
