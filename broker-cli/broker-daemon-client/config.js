const path = require('path')
const os = require('os')
const DEFAULT_CONFIG = require('../.kcli.js')

try {
  var USER_CONFIG = require(path.resolve(os.homedir(), '.kcli.js'))
} catch (e) {
  USER_CONFIG = {}
}

module.exports = Object.assign({}, USER_CONFIG, DEFAULT_CONFIG)
