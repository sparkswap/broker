/**
 * Logging utility for Broker
 *
 * @author kinesis
 */

const winston = require('winston')

const logger = winston.createLogger({
  level: 'debug',
  json: true,
  humanReadableUnhandledException: true,
  handleExceptions: true,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple()
      )
    })
  ]
})

module.exports = logger
