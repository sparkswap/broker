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
 * @default
 */
const DEFAULT_CONFIG = require('../.sparkswap.default.js')

/**
 * @type {String}
 * @constant
 * @default
 */
const USER_CONFIG_FILE = '.sparkswap.js'

/**
 * A wrapper around path resolution for a user defined `.sparkswap.js` configuration
 * file
 *
 * We attempt to load the file and set default configuration values. We will also
 * warn the user if we have failed to parse their user config file.
 *
 * @return {Object} config
 */
function loadConfig () {
  try {
    var config = require(path.resolve(os.homedir(), USER_CONFIG_FILE))
  } catch (e) {
    // We will warn the user only if the ~/.sparkswap.js configuration file exists
    // but could not be read. We will set the config to the default regardless
    // of the error.
    if (e.message && !e.message.includes(MISSING_FILE_MESSAGE)) {
      console.warn('WARNING: Unable to read user configuration ~/.sparkswap.js. Using default configuration')
    }

    config = {}
  }

  return Object.assign({}, DEFAULT_CONFIG, config)
}

module.exports = { loadConfig }
