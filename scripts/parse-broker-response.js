const [ command, ...data ] = process.argv.slice(2)

const DAEMON_PUBLIC_KEY_DELIMITER = 'daemonPublicKey:'
const DAEMON_LND_HOST_DELIMITER = 'daemonLndHost:'
const DAEMON_CHANNEL_POINT_DELIMITER = 'chanPoint:'

/**
 * Given an array of data from a `sparkswap` command, parses the response
 * to find a specified key
 *
 * @param {String} key
 * @param {Array<String>} data
 * @return {String} result
 * @return {Void} nothing is found
 */
function getKey (key, data) {
  let found = false

  for (let k of data) {
    if (found) return String(k).trim()
    if (k === key) found = true
  }
}

function getKeys (key, data) {
  const result = []
  let found = false

  for (let k of data) {
    if (found) {
      result.push(String(k).trim())
      found = false
      continue
    }

    if (k === key) found = true
  }

  return result
}

/**
 * Returns a public key from a `sparkswap` payload
 *
 * @param {Array<string>} data
 * @return {String} daemonPublicKey
 */
function getPublicKey (data) {
  return getKey(DAEMON_PUBLIC_KEY_DELIMITER, data)
}

/**
 * Returns an lnd host ip from a `sparkswap` payload
 *
 * @param {Array<string>} data
 * @return {String} daemonLndHost
 */
function getHost (data) {
  return getKey(DAEMON_LND_HOST_DELIMITER, data)
}

function getChannelPoints (data) {
  return getKeys(DAEMON_CHANNEL_POINT_DELIMITER, data)
}

function getChannelPointByPubKey (pubKey, data) {
  let next = false

  // We skip the first element because that should be the public key
  for (let i = 1; i < data.length; i++) {
    if (next && data[i].includes(pubKey)) return String(data[i + 2]).trim()
    if (data[i] === 'remotePubkey:') next = true
  }
}

switch (command.toLowerCase()) {
  case 'pubkey':
    const publicKey = getPublicKey(data)
    if (!publicKey) throw new Error('parser-broker-response.js - No public key found')
    process.stdout.write(publicKey)
    break
  case 'host':
    const host = getHost(data)
    if (!host) throw new Error('parser-broker-response.js - No host found')
    process.stdout.write(host)
    break
  case 'channels':
    let chanPoints = getChannelPoints(data)
    if (!chanPoints) throw new Error('parser-broker-response.js - No host found')
    chanPoints = chanPoints.map(r => r.replace('\',', '').replace('\'', ''))
    chanPoints = chanPoints.join(',')
    process.stdout.write(chanPoints)
    break
  case 'channelpoint':
    const pubKey = data[0]
    let chanPoint = getChannelPointByPubKey(pubKey, data)
    chanPoint = chanPoint.replace('\',', '').replace('\'', '')
    process.stdout.write(chanPoint)
}
