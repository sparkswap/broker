const { promisify } = require('util')

// `previousBatch` allows us to batch save records in sequence and lock the operation
// to make sure we are not inserting records out of the order they are received.
//
// We set this value to automatically resolve on the first use. This value is then
// subsequently set when a batch needs to be processed
let previousBatch

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

    let batch = []

    async function flush () {
      try {
        await previousBatch
      } catch (e) {
        return reject(e)
      }

      previousBatch = promisify(targetStore.batch)(batch)

      // Clear the batch
      batch = []
    }

    stream.on('error', reject)

    stream.on('end', async () => {
      try {
        // clear the batch
        flush()

        // If a partial batch exists, then we should flush the remaining records
        await previousBatch

        return resolve()
      } catch (e) {
        return reject(e)
      }
    })

    stream.on('data', ({ key, value }) => {
      // The first time we start we should initialize the previousBatch variable
      if (!previousBatch) {
        previousBatch = async () => {}
      }

      const op = createDbOperation(key, value)

      if (!op) return

      batch.push(op)

      if (batch.length < batchSize) return

      flush()
    })
  })
}

module.exports = migrateStore
