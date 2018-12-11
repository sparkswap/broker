/**
 * Logging utility for Broker Daemon
 *
 * Writes all logs with level `info` (or as specific by environment) and below
 * to `combined.log`
 * Additionally, writes all log errors (and below) to `error.log`
 *
 * If we're not in production then log to the `console` with the format
 * `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
 *
 * @author SparkSwap
 */

const winston = require('winston')

/**
 * List of properties whose contents should be filtered from logs.
 * @constant
 * @type {Array}
 */
const SENSITIVE_PROP_LIST = Object.freeze([
  'username',
  'pass',
  'password',
  'passphrase',
  'recoverySeed'
])

/**
 * String to replace sensitive data with.
 * @constant
 * @type {String}
 */
const SENSITIVE_REPLACEMENT = '***FILTERED***'

/**
 * Formatter to filter sensitive data from logs.
 */
const filterSensitive = winston.format((info) => {
  const updatedInfo = Object.assign({}, info)

  Object.entries(updatedInfo).forEach(([key, value]) => {
    if (value != null) {
      updatedInfo[key] = SENSITIVE_REPLACEMENT
    }
  })

  return updatedInfo
})

const logger = winston.createLogger({
  level: (process.env.NODE_ENV === 'production') ? 'info' : 'debug',
  format: winston.format.combine(
    filterSensitive(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  json: true,
  humanReadableUnhandledException: true,
  handleExceptions: true
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      filterSensitive(),
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

module.exports = logger
