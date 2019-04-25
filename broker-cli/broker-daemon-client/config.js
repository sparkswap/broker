const path = require('path')
const os = require('os')

/**
 * Default configuration is in the root directory for the SparkSwap CLI
 * @constant
 * @type {Object}
 * @default
 */
const DEFAULT_CONFIG = require('../default-config.js')

/**
 * @constant
 * @type {string}
 * @default
 */
const MISSING_FILE_MESSAGE = 'Cannot find module'

/**
 * @constant
 * @type {string}
 * @default
 */
const USER_CONFIG_FILEPATH = '.sparkswap/config.js'

/**
 * A wrapper around path resolution for a user defined `.sparkswap/config.js` configuration
 * file
 *
 * We attempt to load the file and set default configuration values. We will also
 * warn the user if we have failed to parse their user config file.
 *
 * @returns {Object} config
 */
function loadConfig () {
  try {
    var config = require(path.resolve(os.homedir(), USER_CONFIG_FILEPATH))
  } catch (e) {
    // We will warn the user only if the ~/.sparkswap/config.js configuration file exists
    // but could not be read. We will set the config to the default regardless
    // of the error.
    if (e.message && !e.message.includes(MISSING_FILE_MESSAGE)) {
      console.warn('WARNING: Unable to read user configuration ~/.sparkswap/config.js. Using default configuration')
    }

    config = {}
  }

  return Object.assign({}, DEFAULT_CONFIG, config)
}

module.exports = { loadConfig }
