const crypto = require('crypto')

function generateId () {
  const data = crypto.randomBytes(20).toString('hex')
  return crypto.createHash('sha256').update(data).digest('base64')
}

module.exports = generateId
