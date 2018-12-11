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

const sensitiveList = [
  'pass',
  'password',
  'passphrase',
  'recoverySeed'
]
const filterSensitive = winston.format((info, opts) => {
  return sensitiveList.reduce(([info, key]) => {
    const updatedInfo = Object.assign({}, info)
    if (updatedInfo[key] != null) {
      updatedInfo[key] = '***FILTERED***'
    }
    return updatedInfo
  }, info)
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
