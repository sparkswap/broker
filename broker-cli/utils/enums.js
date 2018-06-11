/**
 * Enums for the Broker-CLI
 *
 * @module broker-cli/utils/enums
 * @author kinesis
 */

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
 * @type {Object<key, String>}
 * @default
 */
const TIME_IN_FORCE = Object.freeze({
  PO: 'PO',
  FOK: 'FOK',
  IOC: 'IOC',
  GTC: 'GTC'
})

/**
 * ORDER TYPES (bid/sell)
 *
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const ORDER_TYPES = Object.freeze({
  BID: 'BID',
  ASK: 'ASK'
})

/**
 * @constant
 * @type {Object<key, String>}
 * @default
 */
const STATUS_CODES = Object.freeze({
  OK: 'OK'
})

/**
 * Max channel balance for an lnd node
 *
 * @constant
 * @type {Number}
 * @default
 */
const MAX_CHANNEL_BALANCE = 16777215

module.exports = {
  TIME_IN_FORCE,
  ORDER_TYPES,
  STATUS_CODES,
  MAX_CHANNEL_BALANCE
}
