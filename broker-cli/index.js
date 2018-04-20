/**
 * File is used to require all commands for kcli (bin/kcli)
 * @author kinesis
 */

const buyCommand = require('./buy')
const sellCommand = require('./sell')
const configCommand = require('./config')

module.exports = {
  buyCommand,
  sellCommand,
  configCommand
}
