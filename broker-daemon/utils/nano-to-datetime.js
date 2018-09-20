const nano = require('nano-seconds')

function nanoToDatetime (nanoseconds) {
  if (nanoseconds.length !== 13) {
    throw new Error('Invalid format for nanoseconds')
  }
  const first = nanoseconds.substring(0, nanoseconds.length - 9)
  const second = nanoseconds.substring(nanoseconds.length - 8, nanoseconds.length)
  const formattedDate = [first, second]
  const datetime = nano.toISOString(formattedDate)
  return datetime
}

module.exports = nanoToDatetime
