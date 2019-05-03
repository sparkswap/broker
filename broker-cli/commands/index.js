/**
 * Commands for Broker-CLI
 *
 * @module broker-cli/index
 * @author SparkSwap
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const marketCommand = require('./market')
const orderbookCommand = require('./orderbook')
const orderCommand = require('./order')
const walletCommand = require('./wallet')
const identityCommand = require('./identity')
const healthCheckCommand = require('./health-check')
const registerCommand = require('./register')
const orderbookStatsCommand = require('./orderbook-stats')

module.exports = {
  buyCommand,
  sellCommand,
  marketCommand,
  orderbookCommand,
  orderCommand,
  walletCommand,
  identityCommand,
  healthCheckCommand,
  registerCommand,
  orderbookStatsCommand
}
