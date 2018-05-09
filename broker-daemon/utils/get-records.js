function getRecords (store, eachRecord, params = {}) {
  return new Promise((resolve, reject) => {
    const stream = store.createReadStream(params)
    const records = []

    stream.on('error', reject)

    stream.on('end', () => {
      resolve(records)
    })

    stream.on('data', ({ key, value }) => {
      records.push(eachRecord(key, value))
    })
  })
}

module.exports = getRecords
