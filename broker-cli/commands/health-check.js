require('colors')

const BrokerDaemonClient = require('../broker-daemon-client')
const { validations, handleError } = require('../utils')
const { RPC_ADDRESS_HELP_STRING, JSON_FORMAT_STRING } = require('../utils/strings')
const Table = require('cli-table')

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
 * Prints health check status summary in Table format.
 * @param {Object} engineStatus
 * @param {Object} orderbookStatus
 * @param {Object} relayerStatus

 * @returns {Void}
 */

function createHealthCheckTable (engineStatus, orderbookStatus, relayerStatus) {
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

  const relayerStatusString = (relayerStatus === STATUS_CODES.OK) ? relayerStatus.green : relayerStatus.red
  healthcheckTable.push(['Relayer', relayerStatusString])

  if (orderbookStatus.length > 0) {
    orderbookStatus.forEach(({ market, status }) => {
      const orderbookStatusString = (status === STATUS_CODES.OK) ? status.green : status.red
      healthcheckTable.push([`${market} Orderbook`, orderbookStatusString])
    })
  } else {
    healthcheckTable.push(['Orderbooks', 'No Statuses Returned'.red])
  }

  healthcheckTable.push(['Daemon', `${STATUS_CODES.OK}`.green])

  ui.push(healthcheckTable.toString())
  console.log(ui.join('\n') + '\n')
}

/**
 * Prints health check status summary in JSON format.
 * @param {Object} engineStatus
 * @param {Object} orderbookStatus
 * @param {Object} relayerStatus

 * @returns {Void}
 */

function createHealthCheckJson (engineStatus, orderbookStatus, relayerStatus) {
  const statuses = []

  if (engineStatus.length > 0) {
    engineStatus.forEach(({ symbol, status }) => {
      const statusString = (status === ENGINE_STATUS_CODES.VALIDATED) ? `${STATUS_CODES.OK}`.green : status.red
      statuses.push({component: `${symbol} engine`, status: statusString})
    })
  } else {
    statuses.push({component: 'engines', status: 'No Statuses Returned'})
  }

  const relayerStatusString = (relayerStatus === STATUS_CODES.OK) ? relayerStatus.green : relayerStatus.red
  statuses.push({component: 'relayer', status: relayerStatusString})

  if (orderbookStatus.length > 0) {
    orderbookStatus.forEach(({ market, status }) => {
      const orderbookStatusString = (status === STATUS_CODES.OK) ? status.green : status.red
      statuses.push({component: `${market} orderbook`, status: orderbookStatusString})
    })
  } else {
    statuses.push({component: `orderbooks`, status: 'No Statuses Returned'.red})
  }

  statuses.push(['daemon', `${STATUS_CODES.OK}`.green])

  console.log({statuses: statuses.toString()} + '\n')
}

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
  const { rpcAddress, json } = opts

  try {
    const client = await new BrokerDaemonClient(rpcAddress)

    const {
      engineStatus = [],
      orderbookStatus = [],
      relayerStatus = STATUS_CODES.UNKNOWN
    } = await client.adminService.healthCheck({})

    if (json) {
      createHealthCheckJson(engineStatus, orderbookStatus, relayerStatus)
    } else {
      createHealthCheckTable(engineStatus, orderbookStatus, relayerStatus)
    }
  } catch (e) {
    logger.error(handleError(e))
  }
};

module.exports = (program) => {
  program
    .command('healthcheck', 'Checks the connection between Broker and the Exchange')
    .option('--rpc-address [rpc-address]', RPC_ADDRESS_HELP_STRING, validations.isHost)
    .option('--json', JSON_FORMAT_STRING, program.BOOLEAN)
    .action(healthCheck)
}
