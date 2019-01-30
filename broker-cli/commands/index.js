/**
 * Commands for Broker-CLI
 *
 * @module broker-cli/index
 * @author SparkSwap
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const infoCommand = require('./info')
const orderbookCommand = require('./orderbook')
const orderCommand = require('./order')
const walletCommand = require('./wallet')
const identityCommand = require('./identity')
const healthCheckCommand = require('./health-check')
const registerCommand = require('./register')

module.exports = {
  buyCommand,
  sellCommand,
  infoCommand,
  orderbookCommand,
  orderCommand,
  walletCommand,
  identityCommand,
  healthCheckCommand,
  registerCommand
}
