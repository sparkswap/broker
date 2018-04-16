/**
 * File is used to require all commands for kcli (bin/kcli)
 * @author kinesis
 */

const buyCommand = require('./buy');
const sellCommand = require('./sell');

module.exports = {
  buyCommand,
  sellCommand,
};
