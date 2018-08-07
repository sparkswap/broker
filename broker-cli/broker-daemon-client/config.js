const path = require('path')
const os = require('os')

/**
 * @type {String}
 * @constant
 * @default
 */
const MISSING_FILE_MESSAGE = 'Cannot find module'

/**
 * Default configuration is in the root directory for the SparkSwap CLI
 * @type {Object}
 * @constant
 */
const DEFAULT_CONFIG = require('../.sparkswap.default.js')

try {
  /**
   * Attempt to load user-defined configuration in their home directory
   * @type {Object}
   */
  var USER_CONFIG = require(path.resolve(os.homedir(), '.sparkswap.js'))
} catch (e) {
  // We will only trigger an error if the `~/.sparkswap.js` configuration file
  // exists on the user's machine. Otherwise we just silently set to a default
  // configuration.
  if (e.message && !e.message.includes(MISSING_FILE_MESSAGE)) {
    console.warn('WARNING: Unable to read user configuration ~/.sparkswap.js. Using default configuration')
  }

  USER_CONFIG = {}
}

/**
 * Export a configuration object with user configuration taking precedence over defaults
 * @type {Object}
 */
module.exports = Object.assign({}, DEFAULT_CONFIG, USER_CONFIG)
