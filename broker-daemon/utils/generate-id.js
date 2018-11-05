const crypto = require('crypto')

function generateId () {
  const data = crypto.randomBytes(20).toString('hex')
  return urlEncode(crypto.createHash('sha256').update(data).digest('base64'))
}

function urlEncode (base64Str) {
  return base64Str
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

module.exports = generateId
