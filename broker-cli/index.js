/**
 * @author kinesis
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const orderbookCommand = require('./orderbook')
const configCommand = require('./config')
const setupCommand = require('./setup')

module.exports = {
  buyCommand,
  sellCommand,
  configCommand,
  orderbookCommand,
  setupCommand
}
