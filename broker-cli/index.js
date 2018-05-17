/**
 * Commands for Broker-CLI
 *
 * @module broker-cli/index
 * @author kinesis
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const orderbookCommand = require('./orderbook')
const configCommand = require('./config')
const healthCheckCommand = require('./health-check')
const depositCommand = require('./deposit')

module.exports = {
  buyCommand,
  sellCommand,
  configCommand,
  orderbookCommand,
  healthCheckCommand,
  depositCommand
}
