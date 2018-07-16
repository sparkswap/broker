/**
 * Commands for Broker-CLI
 *
 * @module broker-cli/index
 * @author kinesis
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const orderbookCommand = require('./orderbook')
const healthCheckCommand = require('./health-check')
const walletCommand = require('./wallet')
const orderCommand = require('./order')

module.exports = {
  buyCommand,
  sellCommand,
  orderbookCommand,
  healthCheckCommand,
  walletCommand,
  orderCommand
}
