const { readFileSync } = require('fs')

class Identity {
  constructor (privKeyPath, pubKeyPath) {
    this.privKeyPath = privKeyPath
    this.pubKeyPath = pubKeyPath
  }

  loadSync () {
    this.privKey = readFileSync(this.privKeyPath)
    this.pubKey = readFileSync(this.pubKeyPath)
  }
}

Identity.load = function (privKeyPath, pubKeyPath) {
  const id = new this(privKeyPath, pubKeyPath)
  id.loadSync()
  return id
}

module.exports = Identity
