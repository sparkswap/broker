const path = require('path')
const os = require('os')

/**
 * Default configuration is in the root directory for KCLI
 * @type {Object}
 * @constant
 */
const DEFAULT_CONFIG = require('../.kcli.default.js')

try {
  /**
   * Attempt to load user-defined configuration in their home directory
   * @type {Object}
   */
  var USER_CONFIG = require(path.resolve(os.homedir(), '.kcli.js'))
} catch (e) {
  USER_CONFIG = {}
}

/**
 * Export a configuration object with user configuration taking precedence over defaults
 * @type {Object}
 */
module.exports = Object.assign({}, DEFAULT_CONFIG, USER_CONFIG)
