const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING } = require('../utils/strings')
const Table = require('cli-table2')
require('colors')

/**
 *
 * Register Broker with the Relayer
 *
 * ex: `sparkswap register`
 *
 * @param {object} args
 * @param {object} opts
 * @param {string} [rpcAddress=null] - broker rpc address
 * @param {Logger} logger
 */

async function register (args, opts, logger) {
  const { rpcAddress = null } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    const { url } = await client.adminService.register({})
    const registerTable = new Table({
      chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      style: { border: ['green'] },
      align: 'center'
    })

    registerTable.push([''])
    registerTable.push([{ hAlign: 'center', content: 'Successfully registered Broker with the Ϟ Sparkswap Relayer!' }])
    registerTable.push([''])
    registerTable.push([{ hAlign: 'center', content: `Go to ${url.cyan} to complete registration.` }])
    registerTable.push([''])

    logger.info(registerTable.toString())
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('register', 'Registers the Broker with the relayer')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(register)
}
