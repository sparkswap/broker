const crypto = require('crypto')
const base64Lex = require('../utils/base64-lex')

/**
 * Generate a unique ID string
 * We use 12 bytes of randonmness since this is for a single broker.
 * We start with the current timestamp so that they are automatically time ordered.
 * The randomness can be increased for particularly high-frequency brokers as nothing
 * should depend on the length of this ID.
 * @returns {string} 16 characters ordered by timestamp
 */
function generateId () {
  // initialize the buffer to hold our 12 byte  ID
  const id = Buffer.alloc(12)

  // prepend 32 bits of the timestamp in seconds so that IDs are ordered by creation date
  const timestamp = Math.floor(Date.now() / 1000)
  id.writeUInt32BE(timestamp)

  // add 8 bytes of random data to make the ID unique
  const rand = crypto.randomBytes(8)
  rand.copy(id, 4)

  return base64Lex(id)
}

module.exports = generateId
