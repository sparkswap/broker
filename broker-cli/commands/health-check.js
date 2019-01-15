require('colors')

const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING } = require('../utils/strings')
const Table = require('cli-table')
const size = require('window-size')

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
 * Statuses for whether or not the orderbook is synced
 * @constant
 * @type {Object}
 */
const SYNCED_STATUS = Object.freeze({
  NOT_SYNCED: 'NOT_SYNCED'
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
    const client = await new BrokerDaemonClient(rpcAddress)

    const {
      engineStatus = [],
      orderbookStatus = [],
      relayerStatus = STATUS_CODES.UNKNOWN
    } = await client.adminService.healthCheck({})

    const windowWidth = size.get().width
    const unitWidth = Math.floor(windowWidth / 16)

    const healthcheckTable = new Table({
      head: ['Component', 'Status'],
      colWidths: [unitWidth, unitWidth],
      style: { head: ['gray'] }
    })

    const ui = []

    ui.push('')
    ui.push('Sparkswap Healthcheck'.bold.white)
    ui.push('')

    if (engineStatus.length > 0) {
      engineStatus.forEach(({ symbol, status }) => {
        const statusString = status === ENGINE_STATUS_CODES.VALIDATED ? `${STATUS_CODES.OK}`.green : `${status}`.red
        healthcheckTable.push([`${symbol} Engine`, statusString])
      })
    } else {
      healthcheckTable.push(['Engines', 'No Statuses Returned'.red])
    }

    const relayerStatusString = relayerStatus === STATUS_CODES.OK ? `${relayerStatus}`.green : `${relayerStatus}`.red
    healthcheckTable.push(['Relayer', relayerStatusString])

    orderbookStatus.forEach(({ market, synced }) => {
      const orderbookStatusString = synced ? STATUS_CODES.OK.green : SYNCED_STATUS.NOT_SYNCED.red
      healthcheckTable.push([`${market} Orderbook`, orderbookStatusString])
    })

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
