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
    const batch = targetStore.batch()

    stream.on('data', ({ key, value }) => {
      const op = createDbOperation(key, value)

      if (op) {
        batch.add(op)
      }
    })

    stream.on('end', () => {
      if (!batch.length) {
        return resolve()
      }

      batch.write(() => resolve()).catch(err => reject(err))
    })

    stream.on('error', reject)
  })
}

module.exports = migrateStore
