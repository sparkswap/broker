/**
 * File is used to require all commands for kcli (bin/kcli)
 * @author kinesis
 */

const buy = require('./buy');
const sell = require('./sell');

module.exports = {
  buy,
  sell,
};
