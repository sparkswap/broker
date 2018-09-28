const nano = require('nano-seconds')

/**
 * Converts nanoseconds string to ISO8601 datetime
 *
 * @param {String} nanoseconds
 * @return {String} ISO8601 string
 */
function nanoToDatetime (nanoseconds) {
  const timeMilliseconds = nanoseconds.substring(0, nanoseconds.length - 9)
  const timeNanoseconds = nanoseconds.substring(nanoseconds.length - 9, nanoseconds.length)
  const formattedDate = [timeMilliseconds, timeNanoseconds]
  const datetime = nano.toISOString(formattedDate)
  return datetime
}

module.exports = nanoToDatetime
