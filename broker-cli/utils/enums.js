/**
 * Enums for the Broker-CLI
 *
 * @module broker-cli/utils/enums
 * @author SparkSwap
 */

/** @typedef {{[k: string]: string}} Dictionary */

/**
 * TIME IN FORCE
 *
 * Options:
 * GTC - good til cancel
 * IOC - immediate or cancel
 * FOK - fill or kill
 * PO - post only
 *
 * @constant
 * @type {Dictionary}
 * @default
 */
const TIME_IN_FORCE = Object.freeze({
  PO: 'PO',
  GTC: 'GTC'
  // FOK and IOC are not supported on the broker yet.
  // FOK: 'FOK',
  // IOC: 'IOC',
})

/**
 * ORDER TYPES (bid/sell)
 *
 * @constant
 * @type {Dictionary}
 * @default
 */
const ORDER_TYPES = Object.freeze({
  BID: 'BID',
  ASK: 'ASK'
})

module.exports = {
  TIME_IN_FORCE,
  ORDER_TYPES
}
