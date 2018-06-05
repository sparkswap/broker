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
      format: winston.format.printf((info) => `${info.message}`)
    }),
    new winston.transports.File({
      filename: 'kcli-history.log',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf((info) => {
          if (info.level === 'info') {
            return `[KCLI - ${info.timestamp}]: ${info.message}`
          } else if (info.level === 'error') {
            return `[KCLI - ${info.timestamp}] [ERROR]: ${info.message}`
          } else if (info.level === 'debug') {
            return `[KCLI - ${info.timestamp}] [DEBUG]: ${info.message}`
          }

          return `[KCLI - ${info.timestamp}]: ${info.message}`
        })
      )
    })
  ]
})

module.exports = logger
