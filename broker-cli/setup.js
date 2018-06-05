/**
 * setup
 * @module broker-cli/setup
 */
const BrokerDaemonClient = require('./broker-daemon-client')
const { validations, askQuestion } = require('./utils')

/**
 * @constant
 * @type {Array<string>}
 * @default
 */
const ACCEPTED_ANSWERS = Object.freeze(['y', 'yes'])

/**
 * @constant
 * @type {Array<string>}
 * @default
 */
const SUPPORTED_SYMBOLS = Object.freeze(['BTC', 'LTC'])

/**
 * init
 *
 * ex: `kcli init`
 *
 * @function
 * @param {String} commitmentAmount
 * @param {Logger} logger
 * @param {String} [rpcAddress=null]
 * @return {Void}
 */
async function setup (args, opts, logger) {
  const { symbol } = args
  const { rpcAddress = null } = opts

  const client = new BrokerDaemonClient(rpcAddress)
  const { balance } = await client.walletBalance()

  if (parseInt(balance) === 0) return logger.info('Your current balance is 0, please add funds to your daemon (or check the status of your daemon)')

  const answer = await askQuestion(`Are you OK committing ${balance} in ${symbol} to the relayer? (Y/N) `)

  if (!ACCEPTED_ANSWERS.includes(answer.toLowerCase())) return logger.info('Received \'no\' response. Quitting setup')

  try {
    const res = await new BrokerDaemonClient(rpcAddress).setup(balance, symbol)
    logger.info('Successfully added broker daemon to the kinesis exchange!', res)
  } catch (e) {
    logger.error(e.toString())
  }
}

module.exports = (program) => {
  program
    .command('setup', 'Starts the setup process of a Kinesis Broker Daemon')
    .argument('<symbol>', `Supported currencies for the exchange: ${SUPPORTED_SYMBOLS.join('/')}`, SUPPORTED_SYMBOLS, null)
    .option('--rpc-address', 'Location of the RPC server to use.', validations.isHost)
    .action(setup)
}
