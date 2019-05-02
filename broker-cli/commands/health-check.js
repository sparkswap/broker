require('colors')

const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING } = require('../utils/strings')
const Table = require('cli-table2')

/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const STATUS_CODES = Object.freeze({
  OK: 'OK',
  UNKNOWN: 'UNKNOWN'
})

/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const RELAYER_STATUS_CODES = Object.freeze({
  RELAYER_OK: 'RELAYER_OK'
})

/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const ORDERBOOK_STATUS_CODES = Object.freeze({
  ORDERBOOK_OK: 'ORDERBOOK_OK'
})

/**
 * Engine status codes we expect to be returned from the engine, defined in:
 * https://github.com/sparkswap/lnd-engine/blob/master/src/constants/engine-statuses.js
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const ENGINE_STATUS_CODES = Object.freeze({
  VALIDATED: 'VALIDATED'
})

/**
 * sparkswap healthcheck
 *
 * Tests the broker and engine connection for the cli
 *
 * ex: `sparkswap healthcheck`
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} [rpcAddress] broker rpc address
 * @param {Logger} logger
 */

async function healthCheck (args, opts, logger) {
  const { rpcAddress } = opts

  try {
    const client = new BrokerDaemonClient(rpcAddress)

    const {
      engineStatus = [],
      orderbookStatus: orderbookStatuses = [],
      relayerStatus = STATUS_CODES.UNKNOWN
    } = await client.adminService.healthCheck({})

    const healthcheckTable = new Table({
      head: ['Component', 'Status'],
      style: { head: ['gray'] }
    })

    const ui = []

    ui.push('')
    ui.push('Sparkswap Healthcheck'.bold.white)
    ui.push('')

    if (engineStatus.length > 0) {
      engineStatus.forEach(({ symbol, status }) => {
        const statusString = (status === ENGINE_STATUS_CODES.VALIDATED) ? `${STATUS_CODES.OK}`.green : status.red
        healthcheckTable.push([`${symbol} Engine`, statusString])
      })
    } else {
      healthcheckTable.push(['Engines', 'No Statuses Returned'.red])
    }

    const relayerStatusString = (relayerStatus === RELAYER_STATUS_CODES.RELAYER_OK) ? `${STATUS_CODES.OK}`.green : relayerStatus.red
    healthcheckTable.push(['Relayer', relayerStatusString])

    if (orderbookStatuses.length) {
      orderbookStatuses.forEach(({ market, status: orderbookStatus }) => {
        const orderbookStatusString = (orderbookStatus === ORDERBOOK_STATUS_CODES.ORDERBOOK_OK) ? `${STATUS_CODES.OK}`.green : orderbookStatus.red
        healthcheckTable.push([`${market} Orderbook`, orderbookStatusString])
      })
    } else {
      healthcheckTable.push(['Orderbooks', 'No Statuses Returned'.red])
    }

    healthcheckTable.push(['Daemon', `${STATUS_CODES.OK}`.green])

    ui.push(healthcheckTable.toString())
    console.log(ui.join('\n') + '\n')
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('healthcheck', 'Checks the connection between Broker and the Exchange')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .action(healthCheck)
}
