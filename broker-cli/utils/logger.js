/**
 * Logging utility for Broker
 *
 * @author kinesis
 */

const winston = require('winston')
const prettyjson = require('prettyjson')

const logger = winston.createLogger({
  level: 'debug',
  json: true,
  humanReadableUnhandledException: true,
  handleExceptions: true,
  transports: [
    new winston.transports.Console({
      format: winston.format.printf((info) => {
        if (info.level === 'error') {
          // TODO: Expand error codes for broker
          // TODO: remove grpc logic in winston plugin
          if (info.code === 14) {
            info.message = 'Connection failed between the CLI and Broker'
          }

          return prettyjson.render(info, { keysColor: 'red' })
        } else if (typeof info.message === 'object') {
          return prettyjson.render(info.message)
        } else {
          return info.message
        }
      })
    }),
    new winston.transports.File({
      filename: 'kcli-history.log',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.simple()
      )
    })
  ]
})

module.exports = logger
