const Broker = require('./broker')
const { validations } = require('./utils')

/**
 * kcli new-wallet-address
 *
 * Tests the broker and engine connection for the cli
 *
 * ex: `kcli healthcheck`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress] broker rpc address
 * @param {Logger} logger
 */

async function newWalletAddress (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const { address } = await new Broker(rpcAddress).newWalletAddress()
    logger.info(`Address: ${JSON.stringify(address)}`)
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('new-wallet-address', 'Generates a new wallet address for a configured daemon wallet')
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(newWalletAddress)
}
