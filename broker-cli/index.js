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
const walletCommand = require('./wallet')
const orderStatusCommand = require('./order-status')
const myOrdersCommand = require('./my-orders')

module.exports = {
  buyCommand,
  sellCommand,
  configCommand,
  orderbookCommand,
  healthCheckCommand,
  walletCommand,
  orderStatusCommand,
  myOrdersCommand
}
