/**
 * Index of the start of millisecond/nanoseconds for a nano formatted timestamp
 * @constant
 * @type {Integer}
 * @default
 */
const NANO_SECOND_SPLIT_INDEX = 9

/**
 * Converts a nano-second timestamp to a `nano` array that can be used w/ the
 * `nano-seconds` library. A `nano` array is defined as:
 * [ 'timestamp (10)', 'milliseconds (3), nanoseconds (6)']
 *
 * @param {String} timestamp - nano-second timestamp
 * @return {Array<String,String>}
 */
function nanoTimestampToNanoType (timestamp) {
  return [
    // First portion is the timestamp that includes year/month/day/seconds
    timestamp.substring(0, timestamp.length - NANO_SECOND_SPLIT_INDEX),
    // Second portion is the < seconds portion that includes milliseconds/nanoseconds
    timestamp.substring(timestamp.length - NANO_SECOND_SPLIT_INDEX, timestamp.length)
  ]
}

module.exports = nanoTimestampToNanoType
