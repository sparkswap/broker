const { promisify } = require('util')

/** @typedef {import('level-sublevel')} Sublevel

/**
 * Pipe data from one sublevel store into another
 *
 * @param  {Sublevel} sourceStore       - Sublevel that is the source of the data to pipe
 * @param  {Sublevel} targetStore       - Sublevel that is the destination of the data
 * @param  {Function} createDbOperation - Function that returns a sublevel batch-compatible database operation to take on the target store
 * @param  {number}   batchSize         - Number of operations to batch before executing on the target database
 * @returns {Promise<void>}
 */
async function migrateStore (sourceStore, targetStore, createDbOperation, batchSize = 2000) {
  return new Promise((resolve, reject) => {
    let batch = []

    const stream = sourceStore.createReadStream()
    const processBatch = promisify(targetStore.batch)

    stream.on('data', async ({ key, value }) => {
      const op = createDbOperation(key, value)

      if (!op) return

      batch.push(op)

      if (batch.length < batchSize) return

      try {
        // Pause the stream so that we process and transfer records to the targetStore
        // in the order that they were received
        stream.pause()

        await processBatch(batch)

        // clear the batch
        batch = []

        stream.resume()
      } catch (e) {
        return reject(e)
      }
    })

    stream.on('end', async () => {
      try {
        await processBatch(batch)
        return resolve()
      } catch (e) {
        return reject(e)
      }
    })

    stream.on('error', reject)
  })
}

module.exports = migrateStore
