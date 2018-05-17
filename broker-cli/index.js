/**
 * @author kinesis
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const orderbookCommand = require('./orderbook')
const configCommand = require('./config')
const setupCommand = require('./setup')
const healthCheckCommand = require('./health-check')
const newWalletAddressCommand = require('./new-wallet-address')

module.exports = {
  buyCommand,
  sellCommand,
  configCommand,
  orderbookCommand,
  healthCheckCommand,
  setupCommand,
  newWalletAddressCommand
}
